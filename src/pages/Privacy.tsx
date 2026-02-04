import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Shield, Eye, Database, Lock, Globe, Mail } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: February 4, 2026</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="glass-card p-6">
              <p className="text-muted-foreground">
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information in accordance with the Kenya Data Protection Act, 2019. We are committed to protecting your privacy and ensuring the security of your personal data.
              </p>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">1. Information We Collect</h2>
              </div>
              <p className="text-muted-foreground mb-4">We collect the following types of information:</p>
              <h3 className="font-medium mb-2">Personal Information:</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Email address</li>
                <li>Phone number (for M-PESA transactions)</li>
                <li>Full name (if provided)</li>
                <li>Account credentials</li>
              </ul>
              <h3 className="font-medium mb-2">Transaction Information:</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>M-PESA transaction receipts</li>
                <li>Trading history (buys, sells)</li>
                <li>Wallet balances and holdings</li>
                <li>Referral codes and commission data</li>
              </ul>
              <h3 className="font-medium mb-2">Technical Information:</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>IP address and browser type</li>
                <li>Device information</li>
                <li>Usage patterns and analytics</li>
              </ul>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>To create and manage your account</li>
                <li>To process M-PESA transactions and trades</li>
                <li>To track referral commissions and rewards</li>
                <li>To communicate important updates about your account</li>
                <li>To prevent fraud and ensure platform security</li>
                <li>To comply with legal obligations and regulatory requirements</li>
                <li>To improve our services and user experience</li>
              </ul>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">3. Data Security</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational security measures to protect your personal data, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and employee training</li>
                <li>Secure data centers with physical security</li>
              </ul>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">4. Data Sharing</h2>
              </div>
              <p className="text-muted-foreground mb-4">We may share your information with:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Safaricom/M-PESA:</strong> For payment processing</li>
                <li><strong>Service providers:</strong> Who assist in platform operations</li>
                <li><strong>Law enforcement:</strong> When required by law or court order</li>
                <li><strong>Regulatory bodies:</strong> To comply with financial regulations</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We do not sell your personal data to third parties.
              </p>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">5. Your Rights Under Kenya Data Protection Act</h2>
              <p className="text-muted-foreground mb-4">Under the Data Protection Act, 2019, you have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
                <li>Lodge a complaint with the Data Commissioner</li>
              </ul>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal data for as long as your account is active or as needed to provide services. Transaction records are retained for 7 years as required by Kenyan financial regulations. You may request deletion of your account, subject to legal retention requirements.
              </p>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">7. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, and remember your preferences. You can control cookie settings through your browser, though some features may not function properly without cookies.
              </p>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">8. Contact Us</h2>
              </div>
              <p className="text-muted-foreground">
                For privacy-related inquiries or to exercise your data rights, contact our Data Protection Officer at:
              </p>
              <ul className="list-none text-muted-foreground space-y-2 mt-4">
                <li>Email: privacy@cryptolaunch.co.ke</li>
                <li>Phone: +254 700 000 000</li>
                <li>Address: Nairobi, Kenya</li>
              </ul>
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
