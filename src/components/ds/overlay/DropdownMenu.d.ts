import * as React from 'react';
export interface DropdownMenuItem { label: string; icon?: string; danger?: boolean; onSelect?: () => void; }
/** Glass popover menu anchored to a trigger element — row "more" menus, user menu. */
export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'end';
}
export declare function DropdownMenu(props: DropdownMenuProps): JSX.Element;
