import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Blocks, ArrowRight, Shield, Globe, Zap, 
  Database, Link2, Users, Lock, Layers
} from 'lucide-react';

const concepts = [
  {
    icon: Blocks,
    title: 'What is Blockchain?',
    description: 'A blockchain is a distributed digital ledger that records transactions across a network of computers. Each "block" contains a group of transactions, and these blocks are linked together in a chronological "chain." Once data is recorded, it cannot be altered — making it tamper-proof and transparent.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Database,
    title: 'Decentralized Ledger',
    description: 'Unlike traditional banks that keep records in one place, blockchain distributes copies of the ledger across thousands of computers (nodes) worldwide. No single entity controls the data. This means there\'s no single point of failure — if one node goes down, the network continues operating.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Link2,
    title: 'How Blocks Are Linked',
    description: 'Each block contains a cryptographic hash of the previous block, creating an unbreakable chain. If someone tries to alter a past transaction, the hash would change, breaking the chain and alerting the entire network. This is what makes blockchain immutable and secure.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Lock,
    title: 'Cryptographic Security',
    description: 'Blockchain uses advanced cryptography to secure transactions. Every user has a pair of keys: a public key (like your account number, visible to everyone) and a private key (like your password, known only to you). Transactions are signed with your private key, proving ownership without revealing sensitive information.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: Users,
    title: 'Consensus Mechanisms',
    description: 'Before a new block is added, the network must agree it\'s valid. Different blockchains use different methods: Proof of Work (PoW) requires miners to solve complex puzzles, while Proof of Stake (PoS) — used by modern networks — selects validators based on the amount of cryptocurrency they "stake" as collateral.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Zap,
    title: 'Smart Contracts',
    description: 'Smart contracts are self-executing programs stored on the blockchain. They automatically enforce agreements when conditions are met — no middleman required. For example, a smart contract can automatically release payment when a product is delivered, or distribute token rewards to holders.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Layers,
    title: 'Tokens & Coins',
    description: 'Coins (like SOL) are the native currency of a blockchain. Tokens are built on top of existing blockchains using smart contracts. On this platform, each token follows a bonding curve model: as more people buy, the price increases mathematically, creating organic price discovery without traditional market makers.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Globe,
    title: 'Real-World Applications',
    description: 'Beyond cryptocurrency, blockchain enables: supply chain tracking (verify where products come from), digital identity (own your personal data), DeFi (decentralized finance — lending, borrowing without banks), NFTs (unique digital ownership), and governance (transparent voting systems).',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
];

const steps = [
  { step: '1', title: 'Transaction Created', desc: 'A user initiates a transaction (e.g., buying tokens)' },
  { step: '2', title: 'Broadcast to Network', desc: 'The transaction is sent to all nodes in the network' },
  { step: '3', title: 'Validation', desc: 'Validators verify the transaction using consensus rules' },
  { step: '4', title: 'Block Formation', desc: 'Valid transactions are grouped into a new block' },
  { step: '5', title: 'Chain Update', desc: 'The new block is added to the chain and distributed to all nodes' },
  { step: '6', title: 'Confirmation', desc: 'The transaction is now permanent and cannot be reversed' },
];

export default function Blockchain() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-20 sm:pt-24 pb-16 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 sm:mb-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent">
              <Blocks className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display mb-3">How Blockchain Works</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            A comprehensive guide to understanding blockchain technology, from basic concepts to advanced applications
          </p>
        </motion.div>

        {/* Transaction Flow */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">How a Transaction Works</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {steps.map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Card className="glass-card h-full text-center">
                  <CardContent className="p-3 sm:p-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg font-bold text-primary">{s.step}</span>
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-1">{s.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Core Concepts */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {concepts.map((concept, i) => (
            <motion.div key={concept.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <Card className="glass-card h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${concept.bg} flex-shrink-0`}>
                      <concept.icon className={`h-5 w-5 ${concept.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base mb-2">{concept.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{concept.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Security Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-10 sm:mt-14">
          <Card className="glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <CardContent className="p-6 sm:p-8 relative">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <h2 className="text-xl sm:text-2xl font-bold">Why Blockchain is Secure</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Immutability</h4>
                  <p className="text-xs text-muted-foreground">Once recorded, data cannot be changed. Every attempt to alter history is immediately detected by the network.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Decentralization</h4>
                  <p className="text-xs text-muted-foreground">No single point of failure. The network operates across thousands of independent nodes worldwide.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Transparency</h4>
                  <p className="text-xs text-muted-foreground">All transactions are publicly verifiable. Anyone can audit the blockchain and verify its integrity.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
