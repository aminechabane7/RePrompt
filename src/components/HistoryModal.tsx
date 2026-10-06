import React, { useState, useEffect } from 'react';
import { PromptHistoryItem } from '../types';
import { X, Trash2, Copy, Check, Clock, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (item: PromptHistoryItem) => void;
  onOpenAuthModal?: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  onOpenAuthModal,
}) => {
  const { user, session } = useAuth();
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const PAGE_SIZE = 20;

  // Load history from Supabase when user is logged in
  const fetchUserHistory = async (pageNum: number = 0, append: boolean = false) => {
    if (!user || !supabase || !isSupabaseConfigured) return;
    setLoading(true);

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('generations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formatted: PromptHistoryItem[] = (data || []).map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.created_at).getTime(),
        mode: row.mode || 'general',
        targetEngine: row.target_engine || 'general',
        detailLevel: row.detail_level || 'detailed',
        detectedStyle: row.detected_style,
        aspectRatio: row.aspect_ratio,
        prompt: row.prompt,
        negativePrompt: row.negative_prompt,
        modelUsed: row.model_used || 'Gemini Vision',
        analysis: {
          subject: '',
          composition: '',
          lighting: '',
          environment: '',
          camera: '',
          style: row.detected_style || '',
          colors: '',
          details: '',
        },
      }));

      if (append) {
        setHistory((prev) => [...prev, ...formatted]);
      } else {
        setHistory(formatted);
      }

      setHasMore(count ? from + formatted.length < count : false);
    } catch (err) {
      console.warn('Failed to load history from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setConfirmClear(false);
      if (user) {
        fetchUserHistory(0, false);
      } else {
        setHistory([]);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!user || !supabase) return;
    try {
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.warn('Error deleting generation item:', err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!user || !supabase) return;
    try {
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('user_id', user.id);

      if (!error) {
        setHistory([]);
        setConfirmClear(false);
      }
    } catch (err) {
      console.warn('Error clearing history:', err);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUserHistory(nextPage, true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="history-modal"
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-neutral-200 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 id="history-modal-title" className="font-semibold text-neutral-900 text-base">
                Prompt History
              </h2>
              <p className="text-xs text-neutral-500">
                {user ? `Cloud-synced to your account (${history.length} items loaded)` : 'Sign in to sync your prompt history'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && history.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Confirm Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="clear-history-button"
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-1 transition-colors"
                  aria-label="Clear all prompt history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )
            )}

            <button
              id="close-history-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Close history modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {!user ? (
            /* Logged-out State */
            <div className="text-center py-12 px-4 text-neutral-500">
              <Clock className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
              <h3 className="text-base font-bold text-neutral-900 mb-1">
                Account Required for Cloud History
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-5 leading-relaxed">
                Sign in to automatically save your generated prompts and access them across all your devices with Supabase Row Level Security.
              </p>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs sm:text-sm hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  Sign In or Create Account
                </button>
              )}
            </div>
          ) : loading && history.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-400 mb-2" />
              <p className="text-xs text-neutral-500 font-mono">Loading your history from Supabase...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <Clock className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-medium text-neutral-700">No prompt history yet</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Prompts you generate will be saved here in your account. Uploaded images are never saved to protect your privacy.
              </p>
            </div>
          ) : (
            <>
              {history.map((item) => (
                <div
                  key={item.id}
                  id={`history-item-${item.id}`}
                  className="p-3.5 rounded-2xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 hover:bg-white transition-all flex flex-col sm:flex-row items-start gap-3 group"
                >
                  {/* Aspect Ratio / Mode Badge */}
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center text-neutral-700 shrink-0">
                    <Sparkles className="w-4 h-4 text-neutral-800 mb-0.5" />
                    <span className="text-[9px] font-mono font-bold uppercase">
                      {item.aspectRatio || 'AI'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-neutral-200 text-neutral-800">
                          {item.mode.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {item.targetEngine && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            {item.targetEngine.toUpperCase()}
                          </span>
                        )}
                        {item.detailLevel && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-neutral-100 text-neutral-600">
                            {item.detailLevel.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-400 font-mono ml-auto sm:ml-0">
                          {new Date(item.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.prompt)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-1 shadow-2xs"
                          aria-label="Copy prompt"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectPrompt(item);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                        >
                          Load
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label="Delete history entry"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Prompt Preview */}
                    <p className="text-xs text-neutral-700 font-mono line-clamp-3 leading-relaxed bg-white p-2.5 rounded-xl border border-neutral-100">
                      {item.prompt}
                    </p>
                  </div>
                </div>
              ))}

              {/* Pagination Load More */}
              {hasMore && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleLoadMore}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More Generations'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
