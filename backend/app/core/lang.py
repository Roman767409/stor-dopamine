"""Response language for public texts (product titles, descriptions, category names).

Translations live in JSONB columns (products.title_i18n, products.description_i18n,
categories.name_i18n) shaped like {"en": "...", "pl": "...", "uk": "..."}; the plain
columns (title, description, name) hold the base text used as the last fallback.
"""

from typing import Any

from fastapi import Header, Response
from sqlalchemy import func
from sqlalchemy.sql.elements import ColumnElement

SUPPORTED_LANGS = ("en", "pl", "uk")
DEFAULT_LANG = "en"

# Non-standard codes people still send
LANG_ALIASES = {"ua": "uk"}


# Turns an Accept-Language header into one of SUPPORTED_LANGS.
# Only the first listed language counts; its region/subtag is dropped
# ("uk-UA" -> "uk", "pl_PL" -> "pl"). Anything unknown falls back to English.
def parse_accept_language(header: str | None) -> str:
    if not header:
        return DEFAULT_LANG
    first = header.split(",", 1)[0].split(";", 1)[0].strip().lower()
    primary = first.replace("_", "-").split("-", 1)[0]
    primary = LANG_ALIASES.get(primary, primary)
    return primary if primary in SUPPORTED_LANGS else DEFAULT_LANG


# FastAPI dependency: the response language of the current request.
# Vary tells caches that the body depends on Accept-Language.
def get_lang(
    response: Response,
    accept_language: str | None = Header(None, alias="Accept-Language"),
) -> str:
    response.headers["Vary"] = "Accept-Language"
    return parse_accept_language(accept_language)


# Picks the text to show: translation for lang -> English translation -> base value.
# Missing keys, nulls and empty strings count as "no translation".
def localized(i18n_value: Any, base_value: str, lang: str) -> str:
    if isinstance(i18n_value, dict):
        for key in (lang, DEFAULT_LANG):
            text = i18n_value.get(key)
            if isinstance(text, str) and text:
                return text
    return base_value


# SQL counterpart of localized() for ORDER BY: the same lang -> en -> base chain.
# lang must come from get_lang (a SUPPORTED_LANGS value); it is sent as a bind parameter.
def localized_sql(i18n_column, base_column, lang: str) -> ColumnElement:
    return func.coalesce(
        func.nullif(i18n_column[lang].astext, ""),
        func.nullif(i18n_column[DEFAULT_LANG].astext, ""),
        base_column,
    )
