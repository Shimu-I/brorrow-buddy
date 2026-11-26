import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p><strong>BorrowBuddy</strong> · Students helping students</p>
        <nav aria-label="Footer">
          <Link href="/">Home</Link><Link href="/loans">Loans</Link><Link href="/fundraisers">Fundraisers</Link><Link href="/contact">Contact</Link>
        </nav>
        <p className="muted small">Payments on this site are a demo – no real money moves. © {new Date().getFullYear()} BorrowBuddy · Team Syntax_Error</p>
      </div>
    </footer>
  );
}
