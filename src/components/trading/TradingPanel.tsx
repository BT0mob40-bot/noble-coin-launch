import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Wallet, AlertCircle, Percent, ArrowDownLeft, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradingPanelProps {
  symbol: string;
  currentPrice: number;
  userBalance: number;
  userFiatBalance: number;
  minBuyAmount: number;
  maxBuyAmount: number;
  feePercentage: number;
  onBuy: (amount: number, phone: string, useWallet: boolean) => void;
  onSell: (amount: number, toWallet: boolean) => void;
  processing: boolean;
  isAuthenticated: boolean;
}

export function TradingPanel({
  symbol,
  currentPrice,
  userBalance,
  userFiatBalance,
  minBuyAmount,
  maxBuyAmount,
  feePercentage,
  onBuy,
  onSell,
  processing,
  isAuthenticated,
}: TradingPanelProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [sliderValue, setSliderValue] = useState([0]);
  const [useWallet, setUseWallet] = useState(false);
  const [sellToWallet, setSellToWallet] = useState(true);

  const amountNum = parseFloat(amount) || 0;
  const totalValue = amountNum * currentPrice;
  const fee = totalValue * (feePercentage / 100);
  const totalWithFee = activeTab === 'buy' ? totalValue + fee : totalValue - fee;

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    if (activeTab === 'sell' && userBalance > 0) {
      setAmount(((userBalance * value[0]) / 100).toFixed(0));
    } else if (activeTab === 'buy') {
      if (useWallet && userFiatBalance > 0) {
        const maxCoins = (userFiatBalance / currentPrice) * (1 - feePercentage / 100);
        setAmount(((maxCoins * value[0]) / 100).toFixed(0));
      } else {
        const maxCoins = maxBuyAmount / currentPrice;
        setAmount(((maxCoins * value[0]) / 100).toFixed(0));
      }
    }
  };

  const presetPercentages = [25, 50, 75, 100];

  const handleSubmit = () => {
    if (activeTab === 'buy') {
      onBuy(amountNum, phone, useWallet);
    } else {
      onSell(amountNum, sellToWallet);
    }
  };

  const isValidBuy = amountNum > 0 && 
    (useWallet ? totalWithFee <= userFiatBalance : phone.length >= 10) && 
    totalValue >= minBuyAmount && 
    totalValue <= maxBuyAmount;
  
  const isValidSell = amountNum > 0 && amountNum <= userBalance;

  const isValid = activeTab === 'buy' ? isValidBuy : isValidSell;

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buy' | 'sell')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger 
            value="buy" 
            className={cn(
              "text-base font-semibold transition-all data-[state=active]:bg-success data-[state=active]:text-success-foreground"
            )}
          >
            Buy
          </TabsTrigger>
          <TabsTrigger 
            value="sell"
            className={cn(
              "text-base font-semibold transition-all data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
            )}
          >
            Sell
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Price Display */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="font-mono font-medium">KES {currentPrice.toFixed(6)}</span>
          </div>

          {/* Buy Tab - Payment Method Selection */}
          {activeTab === 'buy' && isAuthenticated && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseWallet(false)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  !useWallet 
                    ? "border-success bg-success/10 text-success" 
                    : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                )}
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">M-PESA</span>
                {!useWallet && <CheckCircle className="h-4 w-4 ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => setUseWallet(true)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  useWallet 
                    ? "border-success bg-success/10 text-success" 
                    : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                )}
              >
                <Wallet className="h-4 w-4" />
                <span className="text-sm font-medium">Wallet</span>
                {useWallet && <CheckCircle className="h-4 w-4 ml-auto" />}
              </button>
            </div>
          )}

          {/* Wallet Balance Display (when using wallet) */}
          {activeTab === 'buy' && useWallet && isAuthenticated && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-success/10 border border-success/30">
              <span className="text-sm text-success flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Available
              </span>
              <span className="font-mono font-medium text-success">
                KES {userFiatBalance.toLocaleString()}
              </span>
            </div>
          )}

          {/* Sell Tab - Destination Selection */}
          {activeTab === 'sell' && isAuthenticated && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSellToWallet(true)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  sellToWallet 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                )}
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-sm font-medium">To Wallet</span>
                {sellToWallet && <CheckCircle className="h-4 w-4 ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => setSellToWallet(false)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  !sellToWallet 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                )}
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">To M-PESA</span>
                {!sellToWallet && <CheckCircle className="h-4 w-4 ml-auto" />}
              </button>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Amount ({symbol})</Label>
              {activeTab === 'sell' && (
                <span className="text-xs text-muted-foreground">
                  Available: {userBalance.toLocaleString()} {symbol}
                </span>
              )}
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-lg font-mono bg-muted/30 border-border/50 focus:border-primary"
            />
          </div>

          {/* Percentage Slider */}
          <div className="space-y-3">
            <Slider
              value={sliderValue}
              onValueChange={handleSliderChange}
              max={100}
              step={1}
              className={activeTab === 'buy' ? '[&>span]:bg-success' : '[&>span]:bg-destructive'}
            />
            <div className="flex justify-between gap-2">
              {presetPercentages.map((pct) => (
                <Button
                  key={pct}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleSliderChange([pct])}
                >
                  {pct}%
                </Button>
              ))}
            </div>
          </div>

          {/* Phone Input (when buying with M-PESA) */}
          {activeTab === 'buy' && !useWallet && (
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4" />
                M-PESA Phone Number
              </Label>
              <Input
                type="tel"
                placeholder="254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 font-mono bg-muted/30 border-border/50 focus:border-primary"
              />
            </div>
          )}

          {/* Order Summary */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">KES {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Percent className="h-3 w-3" /> Fee ({feePercentage}%)
              </span>
              <span className="font-mono text-warning">KES {fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex items-center justify-between">
              <span className="font-medium">
                {activeTab === 'buy' ? 'Total Cost' : 'You Receive'}
              </span>
              <span className="text-lg font-bold font-mono gradient-text">
                KES {totalWithFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Validation Messages */}
          {totalValue > 0 && totalValue < minBuyAmount && activeTab === 'buy' && (
            <div className="flex items-center gap-2 text-sm text-warning">
              <AlertCircle className="h-4 w-4" />
              Minimum buy amount is KES {minBuyAmount}
            </div>
          )}
          {totalValue > maxBuyAmount && activeTab === 'buy' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Maximum buy amount is KES {maxBuyAmount.toLocaleString()}
            </div>
          )}
          {useWallet && totalWithFee > userFiatBalance && activeTab === 'buy' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Insufficient wallet balance
            </div>
          )}
          {amountNum > userBalance && activeTab === 'sell' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Insufficient balance
            </div>
          )}

          {/* Submit Button */}
          <Button
            className={cn(
              "w-full h-14 text-lg font-bold",
              activeTab === 'buy' 
                ? "bg-success hover:bg-success/90 text-success-foreground" 
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            )}
            disabled={!isValid || processing || !isAuthenticated}
            onClick={handleSubmit}
          >
            {processing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-current border-t-transparent rounded-full"
              />
            ) : !isAuthenticated ? (
              'Sign in to Trade'
            ) : activeTab === 'buy' ? (
              `Buy ${symbol}`
            ) : (
              `Sell ${symbol} ${sellToWallet ? 'to Wallet' : 'to M-PESA'}`
            )}
          </Button>

          {/* User Balance */}
          {isAuthenticated && userBalance > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg py-2">
              <Wallet className="h-4 w-4" />
              Your Holdings: <span className="font-medium text-foreground">{userBalance.toLocaleString()} {symbol}</span>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
