import React, { useState } from 'react';
import { PromptHistoryItem } from '../types';
import { X, Trash2, Copy, Check, Clock, ExternalLink } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PromptHistoryItem[];
  onSelectPrompt: (item: PromptHistoryItem) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectPrompt,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="history-modal"
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-neutral-200 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 text-base">
                Local Prompt History
              </h3>
              <p className="text-xs text-neutral-500">
                Saved in your browser storage ({history.length} prompts)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                id="clear-history-button"
                type="button"
                onClick={onClearHistory}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              id="close-history-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <Clock className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-medium text-neutral-700">No prompt history yet</p>
              <p className="text-xs text-neutral-400 mt-1">
                Prompts you generate will be safely saved here in your browser.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 hover:bg-white transition-all flex flex-col sm:flex-row items-start gap-3 group"
              >
                {/* Thumbnail */}
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={`Saved prompt visual thumbnail generated with ${item.mode.replace(/_/g, ' ')} mode`}
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 rounded-lg object-cover border border-neutral-200 shrink-0 aspect-square"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs text-neutral-400 font-mono shrink-0">
                    IMG
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-neutral-200 text-neutral-800">
                        {item.mode.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.prompt)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-1"
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
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white flex items-center gap-1"
                      >
                        <span>Load</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-700 font-mono line-clamp-2 mt-1">
                    {item.prompt}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-center text-xs text-neutral-500">
          History is stored strictly on your local browser (LocalStorage).
        </div>
      </div>
    </div>
  );
};
