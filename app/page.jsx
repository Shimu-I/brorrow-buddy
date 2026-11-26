import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="pill">🎓 Built for university students</span>
            <h1>Borrow smart.<br /><em>Lend kind.</em><br />Fund what matters.</h1>
            <p className="lead">BorrowBuddy connects students who need a little help with peers who can give it — through fair, transparent loan offers and community fundraisers.</p>
            <div className="hero-btns">
              <Link href="/loans/new" className="btn btn-primary">Apply for a loan</Link>
              <Link href="/fundraisers" className="btn btn-outline">Explore fundraisers</Link>
            </div>
            <ul className="trust"><li>ID-verified members</li><li>You pick the offer</li><li>Track every repayment</li></ul>
          </div>
          <div className="hv" aria-hidden="true">
            <div className="hv-card hv-1">
              <div className="person"><span className="avatar" style={{ width: 40, height: 40 }}>S</span><div><strong>Offer from Sadia</strong><small>Lender · 4.9 ★</small></div></div>
              <div className="hv-amount">৳12,000</div>
              <div className="meta"><span>6 months</span><span>Low interest</span><span>Monthly</span></div>
              <div className="btn btn-primary btn-block btn-sm">Accept offer</div>
            </div>
            <div className="hv-card hv-2">
              <strong>Books for 40 first-years</strong><small>Fundraiser · 12 days left</small>
              <div className="progress"><i style={{ width: '72%' }} /></div>
              <div className="meta" style={{ justifyContent: 'space-between' }}><b>৳28,800 raised</b><span>72%</span></div>
            </div>
            <div className="hv-card hv-3"><span className="avatar" style={{ width: 34, height: 34, background: 'var(--coastal)', color: 'var(--navy)' }}>✓</span><div><strong>Installment 2 of 6 paid</strong><small>Next due 5 Dec</small></div></div>
          </div>
        </div>
      </section>

      <section className="features" id="about">
        <div className="container">
          <div className="page-head"><div><h2 className="page-title">Everything in one friendly place</h2><p className="muted">Whether you need a loan or want to support a cause, BorrowBuddy keeps it clear and fair.</p></div></div>
          <div className="grid">
            <div className="card feature"><h3>Fair, flexible loan offers</h3><p>Post what you need and receive offers from lenders. Compare interest and terms, then accept the one that suits you.</p></div>
            <div className="card feature"><h3>Verified & transparent</h3><p>Members can verify their student ID. Every request is reviewed by an admin before it goes public.</p></div>
            <div className="card feature"><h3>Repay at your pace</h3><p>Pay in monthly installments or one go. Your schedule and progress are always on your profile.</p></div>
            <div className="card feature"><h3>Community fundraisers</h3><p>Raise money for books, medical bills or relief efforts and show supporters live progress.</p></div>
          </div>
        </div>
      </section>

      <section className="features" style={{ paddingTop: 0 }}>
        <div className="container narrow">
          <h2 className="page-title">How it works</h2>
          <div className="steps card">
            <div className="step"><strong>Sign up & verify.</strong> Create a free account and upload your student ID.</div>
            <div className="step"><strong>Ask or give.</strong> Request a loan, make an offer, or start / support a fundraiser.</div>
            <div className="step"><strong>Agree & pay.</strong> Accept an offer, the lender pays, repayments are scheduled automatically.</div>
            <div className="step"><strong>Repay & rate.</strong> Pay installments on time and build a trusted reputation.</div>
          </div>
          <p className="muted small">BorrowBuddy is a student project. All payments are simulated for demonstration.</p>
        </div>
      </section>
    </>
  );
}
