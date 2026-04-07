import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications, usePriceAlerts, type PriceAlert } from '@/hooks/use-push-notifications';
import { toast } from 'sonner';

interface PriceAlertDialogProps {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  currentPrice: number;
}

export function PriceAlertDialog({ coinId, coinName, coinSymbol, currentPrice }: PriceAlertDialogProps) {
  const { isSupported, isEnabled, requestPermission, disable } = usePushNotifications();
  const { alerts, addAlert, removeAlert, toggleAlert } = usePriceAlerts();
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [open, setOpen] = useState(false);

  const coinAlerts = alerts.filter(a => a.coinId === coinId);

  const handleAdd = () => {
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) {
      toast.error('Enter a valid target price');
      return;
    }

    if (!isEnabled) {
      requestPermission().then(ok => {
        if (ok) {
          addAlert({ coinId, coinName, coinSymbol, targetPrice: price, direction });
          toast.success(`Alert set: ${coinSymbol} ${direction} KES ${price}`);
          setTargetPrice('');
        }
      });
      return;
    }

    addAlert({ coinId, coinName, coinSymbol, targetPrice: price, direction });
    toast.success(`Alert set: ${coinSymbol} ${direction} KES ${price}`);
    setTargetPrice('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Bell className="h-3.5 w-3.5" />
          Alerts
          {coinAlerts.filter(a => a.isActive).length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
              {coinAlerts.filter(a => a.isActive).length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Price Alerts – {coinSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notification Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              {isEnabled ? <Bell className="h-4 w-4 text-success" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
              <span>Push Notifications</span>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => checked ? requestPermission() : disable()}
              disabled={!isSupported}
            />
          </div>

          {/* Current Price */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-lg font-bold font-mono text-primary">KES {currentPrice.toFixed(6)}</p>
          </div>

          {/* Add Alert */}
          <div className="flex gap-2">
            <Select value={direction} onValueChange={(v) => setDirection(v as 'above' | 'below')}>
              <SelectTrigger className="w-[100px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Above</span>
                </SelectItem>
                <SelectItem value="below">
                  <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Below</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Target price"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="h-9 text-sm font-mono flex-1"
              step="0.0001"
            />
            <Button size="sm" onClick={handleAdd} className="h-9 gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          {/* Active Alerts */}
          {coinAlerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Your Alerts</p>
              {coinAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Switch checked={alert.isActive} onCheckedChange={() => toggleAlert(alert.id)} />
                    <div>
                      <div className="flex items-center gap-1 text-xs">
                        {alert.direction === 'above' ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className="capitalize">{alert.direction}</span>
                        <span className="font-mono font-medium">KES {alert.targetPrice}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {alert.isActive ? 'Active' : 'Triggered / Inactive'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAlert(alert.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {coinAlerts.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              No alerts set for {coinSymbol}. Add one above to get notified when the price hits your target.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
