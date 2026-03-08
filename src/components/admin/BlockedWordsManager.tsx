import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Ban, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BlockedWord {
  id: string;
  word: string;
}

export function BlockedWordsManager() {
  const [words, setWords] = useState<BlockedWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchWords(); }, []);

  const fetchWords = async () => {
    setLoading(true);
    const { data } = await supabase.from('blocked_words' as any).select('*').order('word');
    setWords((data as any) || []);
    setLoading(false);
  };

  const addWord = async () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    const { error } = await supabase.from('blocked_words' as any).insert({ word: w } as any);
    if (error) {
      if (error.code === '23505') toast.error('Word already exists');
      else toast.error(error.message);
      return;
    }
    setNewWord('');
    fetchWords();
    toast.success(`"${w}" added to blocked list`);
  };

  const removeWord = async (id: string, word: string) => {
    const { error } = await supabase.from('blocked_words' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchWords();
    toast.success(`"${word}" removed`);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ban className="h-4 w-4" /> Blocked Words
        </CardTitle>
        <CardDescription className="text-xs">Words banned from coin names and symbols</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Add blocked word..."
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            className="h-9"
          />
          <Button size="sm" onClick={addWord} disabled={!newWord.trim()} className="gap-1 h-9">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
        ) : words.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No blocked words yet</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {words.map((w) => (
              <Badge key={w.id} variant="outline" className="gap-1 text-xs">
                {w.word}
                <button onClick={() => removeWord(w.id, w.word)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
