import { SharedMenu } from "@/components/shared-menu";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  return <SharedMenu open={open} onClose={onClose} />;
}
