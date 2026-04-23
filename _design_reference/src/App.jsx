/* global React, ReactDOM, Nav, Hero, Painpoints, Features, ReviewAutomation, PlacePlus, Mechanism, Pricing, Promotion, Testimonials, FAQ, ApplyForm, Footer, FloatingCTA */
/* global Showcase */
const App = () => (
  <>
    <Nav/>
    <Hero/>
    <Showcase/>
    <Painpoints/>
    <Features/>
    <ReviewAutomation/>
    <PlacePlus/>
    <Mechanism/>
    <Pricing/>
    <Promotion/>
    <Testimonials/>
    <FAQ/>
    <ApplyForm/>
    <Footer/>
    <FloatingCTA/>
  </>
);
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
