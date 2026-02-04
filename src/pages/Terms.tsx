import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { FileText, AlertTriangle, Scale, Shield, Users, DollarSign, Ban, Globe } from 'lucide-react';

export default function Terms() {
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
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display">Terms & Conditions</h1>
              <p className="text-muted-foreground">Last updated: February 4, 2026</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Important Disclaimer */}
            <div className="glass-card p-6 border-warning/30 bg-warning/5">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-warning flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold text-warning mb-2">Important Risk Disclaimer</h2>
                  <p className="text-muted-foreground">
                    Trading cryptocurrencies involves substantial risk of loss. The value of tokens can be extremely volatile and may result in significant financial losses. You should only invest funds that you can afford to lose entirely. <strong>We are NOT responsible for any "rug pulls," market manipulation, or other malicious activities by token creators.</strong> Users are solely responsible for conducting their own due diligence before investing.
                  </p>
                </div>
              </div>
            </div>

            {/* Sections */}
            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">1. Agreement to Terms</h2>
              </div>
              <p className="text-muted-foreground">
                By accessing or using our platform, you agree to be bound by these Terms and Conditions, which are governed by the laws of the Republic of Kenya. These terms constitute a legally binding agreement between you and our platform. If you do not agree to these terms, you must not use our services.
              </p>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">2. Platform Services</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Our platform provides a marketplace for buying, selling, and trading cryptocurrency tokens using M-PESA mobile money. We facilitate transactions but do not guarantee the value, legitimacy, or future performance of any token listed on our platform.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>We provide technology infrastructure for token trading</li>
                <li>Token prices are determined by market supply and demand through bonding curves</li>
                <li>We charge commission fees on all transactions as disclosed in our fee schedule</li>
                <li>Token creators are independent third parties, not our agents or employees</li>
              </ul>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">3. User Eligibility</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                To use our platform, you must:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Be a resident of Kenya or a country where such services are legal</li>
                <li>Have a valid M-PESA account registered in your name</li>
                <li>Not be prohibited by any applicable laws from using our services</li>
                <li>Complete any required identity verification processes</li>
              </ul>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">4. Fees and Payments</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                All transactions on our platform are subject to fees:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Trading fees: A percentage of each buy/sell transaction</li>
                <li>Coin creation fee: 500,000 KES for listing a new token</li>
                <li>M-PESA transaction fees may apply as per Safaricom's terms</li>
                <li>All fees are non-refundable once a transaction is completed</li>
              </ul>
            </section>

            <section className="glass-card p-6 border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-3 mb-4">
                <Ban className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-semibold text-destructive">5. No Liability for Token Failures</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                <strong>We explicitly disclaim all liability for:</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Rug pulls</strong> - When token creators abandon projects and remove liquidity</li>
                <li><strong>Market manipulation</strong> - Pump and dump schemes or coordinated trading</li>
                <li><strong>Token failures</strong> - Projects that fail to deliver promised features</li>
                <li><strong>Price volatility</strong> - Losses due to market price fluctuations</li>
                <li><strong>Smart contract bugs</strong> - Issues in token implementation</li>
                <li><strong>Fraudulent tokens</strong> - Tokens created with malicious intent</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Token creators are solely responsible for their projects. We conduct no vetting or auditing of tokens or their creators. <strong>Invest at your own risk.</strong>
              </p>
            </section>

            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">6. Governing Law (Kenya)</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes arising shall be subject to the exclusive jurisdiction of the courts of Kenya. Relevant legislation includes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>The Central Bank of Kenya Act</li>
                <li>The National Payment System Act, 2011</li>
                <li>The Computer Misuse and Cybercrimes Act, 2018</li>
                <li>The Data Protection Act, 2019</li>
                <li>The Consumer Protection Act, 2012</li>
              </ul>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">7. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify, defend, and hold harmless our platform, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the platform, your violation of these terms, or your violation of any rights of another party.
              </p>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">8. Modifications</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. Continued use of the platform after any changes constitutes acceptance of the new terms. We will notify users of material changes via email or platform notifications.
              </p>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">9. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, please contact our legal team at legal@cryptolaunch.co.ke or through our platform's support channels.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
