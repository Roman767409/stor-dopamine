from pydantic import BaseModel, ConfigDict, Field

MESSAGE_MAX_LENGTH = 500
MAX_SUGGESTIONS = 3


# Body of POST /api/chat; the message is stripped before the length check
class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=MESSAGE_MAX_LENGTH)


# DopaBot answer: text, recognized intent and up to 3 follow-up prompts
class ChatResponse(BaseModel):
    reply: str
    intent: str
    suggestions: list[str] = Field(default_factory=list, max_length=MAX_SUGGESTIONS)
