// "About us" screen: what DopamineStore is and how it works
import PageContainer from '../components/PageContainer'

function AboutPage() {
  return (
    <PageContainer title="About us">
      <div className="max-w-2xl flex flex-col gap-4 text-gray-600">
        <p>
          DopamineStore is an online shopping simulator for mindful consumption. It gives you the
          full joy of shopping: browsing the catalog, filling the cart, checking out and tracking
          the parcel, without spending a single real cent.
        </p>
        <p>
          Every purchase is paid with virtual Dopamine Points (DP). Each account starts with 100 000
          DP, no real money is involved and nothing is ever charged or shipped.
        </p>
        <p>
          Every order you place here is money you kept in the real world. The savings dashboard
          shows how much you didn&apos;t spend, so the urge to buy turns into a visible result.
        </p>
      </div>
    </PageContainer>
  )
}

export default AboutPage
