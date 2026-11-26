import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: { default: 'BorrowBuddy – Students helping students', template: '%s – BorrowBuddy' },
  description: 'Fair peer-to-peer student loans and community fundraisers. Borrow smart, lend kind, fund what matters.',
  icons: { icon: '/icon.png' }
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#F7F4EC' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a href="#main" className="skip">Skip to content</a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
