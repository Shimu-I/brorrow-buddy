import Link from 'next/link';
export default function NotFound() {
  return <div className="container section"><div className="state"><h1>Page not found</h1><p>The page you are looking for does not exist.</p><Link className="btn btn-primary" href="/">Go home</Link></div></div>;
}
