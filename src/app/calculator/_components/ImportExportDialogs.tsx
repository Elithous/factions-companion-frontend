"use client";

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Should throw if the pasted text can't be applied. */
  onImport: (raw: string) => void;
}

const DIALOG_CLASS = "flex max-h-[70vh] w-[70vw] max-w-none flex-col";
const TEXTAREA_CLASS = "min-h-[40vh] flex-1 resize-y";

export function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setText('');
      setError('');
    }
    onOpenChange(next);
  };

  const handleImport = () => {
    try {
      onImport(text);
      handleOpenChange(false);
    } catch {
      setError('Invalid import data. Please check the format and try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>Import Configuration</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4">
          <Textarea
            placeholder="Paste your configuration here..."
            value={text}
            onChange={e => setText(e.currentTarget.value)}
            className={TEXTAREA_CLASS}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={handleImport}>Import</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExportDialog({
  open,
  onOpenChange,
  value,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>Export Configuration</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-muted-foreground">Configuration has been copied to clipboard</p>
          <Textarea value={value} readOnly className={TEXTAREA_CLASS} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
