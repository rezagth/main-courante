'use client';

import { Button } from '@/components/ui/button';

export function UndoToast({
  title,
  onUndo,
  onClose,
}: {
  title: string;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-lg bg-zinc-900 p-4 text-white shadow-lg">
      <p className="text-sm">{title}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onUndo}>
          Annuler
        </Button>
        <Button variant="outline" size="sm" className="text-zinc-900" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}
