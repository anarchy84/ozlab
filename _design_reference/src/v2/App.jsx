/* global React, ReactDOM, Nav, Hero, Proof, Features, ReviewFlow, PlacePlus, Mechanism, Pricing, Promo, Testimonials, FAQ, Apply, Footer, FloatingCTA */
const App = () => (
  <>
    <Nav/>
    <Hero/>
    <Proof/>
    <Features/>
    <ReviewFlow/>
    <PlacePlus/>
    <Mechanism/>
    <Pricing/>
    <Promo/>
    <Testimonials/>
    <FAQ/>
    <Apply/>
    <Footer/>
    <FloatingCTA/>
  </>
);
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
