'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
// HugeIcons - Standard Stroke (matching Figma designs)
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  Add01Icon,
  Delete01Icon,
  Tick01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  Sun01Icon,
  Moon02Icon,
  Search01Icon,
  Notification01Icon,
  UserIcon,
  Mail01Icon,
  DashboardSquare02Icon,
  GoogleSheetIcon,
  Task01Icon,
  ScrollIcon,
  Configuration01Icon,
  EditTableIcon,
  CheckListIcon,
  HelpCircleIcon,
  ArrowDown01Icon,
  Home01Icon,
  Calendar01Icon,
  Folder01Icon,
  Edit01Icon,
  Copy01Icon,
  Download01Icon,
  Upload01Icon,
  Share01Icon,
  Link01Icon,
  FilterIcon,
  SortingDownIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  InformationCircleIcon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Loading01Icon,
  RefreshIcon,
  Logout01Icon,
  Login01Icon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

export default function DesignSystemPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'default' | 'lg' | 'xl' | 'full'>('default');

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Design System</h1>
            <p className="text-foreground-secondary mt-2">LootList+ component library preview</p>
          </div>
          <div className="flex items-center gap-3">
            <HugeiconsIcon icon={Sun01Icon} size={16} className="text-foreground-secondary" />
            <Switch checked={darkMode} onCheckedChange={toggleTheme} />
            <HugeiconsIcon icon={Moon02Icon} size={16} className="text-foreground-secondary" />
          </div>
        </div>

        {/* Icons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Icons</h2>
          <p className="text-foreground-secondary">HugeIcons - Standard Stroke style (matching Figma designs)</p>

          <div className="space-y-6">
            {/* Navigation Icons */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Navigation (from Figma)</h3>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: DashboardSquare02Icon, name: 'DashboardSquare02Icon', label: 'Overview' },
                  { icon: GoogleSheetIcon, name: 'GoogleSheetIcon', label: 'Master Sheet' },
                  { icon: Task01Icon, name: 'Task01Icon', label: 'Loot Lists' },
                  { icon: ScrollIcon, name: 'ScrollIcon', label: 'Attendance' },
                  { icon: Configuration01Icon, name: 'Configuration01Icon', label: 'Guild Settings' },
                  { icon: EditTableIcon, name: 'EditTableIcon', label: 'Submissions' },
                  { icon: CheckListIcon, name: 'CheckListIcon', label: 'Raid Tracking' },
                  { icon: HelpCircleIcon, name: 'HelpCircleIcon', label: 'Help' },
                ].map(({ icon: Icon, name, label }) => (
                  <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[100px]">
                    <HugeiconsIcon icon={Icon} size={20} className="text-foreground" />
                    <span className="text-xs text-foreground-secondary text-center">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Actions */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Common Actions</h3>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: Add01Icon, name: 'Add01Icon' },
                  { icon: Delete01Icon, name: 'Delete01Icon' },
                  { icon: Edit01Icon, name: 'Edit01Icon' },
                  { icon: Tick01Icon, name: 'Tick01Icon' },
                  { icon: Cancel01Icon, name: 'Cancel01Icon' },
                  { icon: Copy01Icon, name: 'Copy01Icon' },
                  { icon: Download01Icon, name: 'Download01Icon' },
                  { icon: Upload01Icon, name: 'Upload01Icon' },
                  { icon: Share01Icon, name: 'Share01Icon' },
                  { icon: Link01Icon, name: 'Link01Icon' },
                  { icon: RefreshIcon, name: 'RefreshIcon' },
                ].map(({ icon: Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[80px]">
                    <HugeiconsIcon icon={Icon} size={20} className="text-foreground" />
                    <span className="text-[10px] text-foreground-muted text-center">{name.replace('Icon', '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* UI Elements */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">UI Elements</h3>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: Search01Icon, name: 'Search01Icon' },
                  { icon: FilterIcon, name: 'FilterIcon' },
                  { icon: SortingDownIcon, name: 'SortingDownIcon' },
                  { icon: Settings01Icon, name: 'Settings01Icon' },
                  { icon: MoreHorizontalIcon, name: 'MoreHorizontalIcon' },
                  { icon: MoreVerticalIcon, name: 'MoreVerticalIcon' },
                  { icon: ArrowDown01Icon, name: 'ArrowDown01Icon' },
                  { icon: ArrowRight01Icon, name: 'ArrowRight01Icon' },
                  { icon: Notification01Icon, name: 'Notification01Icon' },
                  { icon: UserIcon, name: 'UserIcon' },
                  { icon: Home01Icon, name: 'Home01Icon' },
                  { icon: Calendar01Icon, name: 'Calendar01Icon' },
                  { icon: Folder01Icon, name: 'Folder01Icon' },
                ].map(({ icon: Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[80px]">
                    <HugeiconsIcon icon={Icon} size={20} className="text-foreground" />
                    <span className="text-[10px] text-foreground-muted text-center">{name.replace('Icon', '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Icons */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Status & Feedback</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[80px]">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-success" />
                  <span className="text-[10px] text-foreground-muted">Success</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[80px]">
                  <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-warning" />
                  <span className="text-[10px] text-foreground-muted">Warning</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[80px]">
                  <HugeiconsIcon icon={Cancel01Icon} size={20} className="text-error" />
                  <span className="text-[10px] text-foreground-muted">Error</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[80px]">
                  <HugeiconsIcon icon={InformationCircleIcon} size={20} className="text-info" />
                  <span className="text-[10px] text-foreground-muted">Info</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background-elevated border border-border min-w-[80px]">
                  <HugeiconsIcon icon={Loading01Icon} size={20} className="text-foreground-secondary animate-spin" />
                  <span className="text-[10px] text-foreground-muted">Loading</span>
                </div>
              </div>
            </div>

            {/* Icon Sizes */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Icon Sizes</h3>
              <div className="flex items-end gap-6">
                <div className="flex flex-col items-center gap-2">
                  <HugeiconsIcon icon={Settings01Icon} size={16} className="text-foreground" />
                  <span className="text-xs text-foreground-muted">16px (w-4)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <HugeiconsIcon icon={Settings01Icon} size={20} className="text-foreground" />
                  <span className="text-xs text-foreground-muted">20px (w-5) ★</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <HugeiconsIcon icon={Settings01Icon} size={24} className="text-foreground" />
                  <span className="text-xs text-foreground-muted">24px (w-6)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <HugeiconsIcon icon={Settings01Icon} size={32} className="text-foreground" />
                  <span className="text-xs text-foreground-muted">32px (w-8)</span>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-2">★ Default size for navigation and UI (matches Figma)</p>
            </div>

            {/* Usage Example */}
            <div className="bg-background-elevated p-4 rounded-lg border border-border">
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Import Pattern</h3>
              <code className="text-sm text-accent">
                {`import { Settings01Icon, Add01Icon } from "hugeicons-react";`}
              </code>
              <p className="text-xs text-foreground-muted mt-2">
                All icons end with "Icon" suffix. Browse full library at hugeicons.com
              </p>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Color Palette</h2>

          <div className="space-y-6">
            {/* Backgrounds */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Backgrounds</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-background border border-border flex items-center justify-center">
                    <span className="text-xs text-foreground-secondary">background</span>
                  </div>
                  <p className="text-xs text-foreground-muted">#09090c (dark)</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-background-subtle border border-border flex items-center justify-center">
                    <span className="text-xs text-foreground-secondary">background-subtle</span>
                  </div>
                  <p className="text-xs text-foreground-muted">#0d0e11 (sidebar)</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg bg-background-elevated border border-border flex items-center justify-center">
                    <span className="text-xs text-foreground-secondary">background-elevated</span>
                  </div>
                  <p className="text-xs text-foreground-muted">#141519 (cards)</p>
                </div>
              </div>
            </div>

            {/* Accent & Status */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Accent & Status</h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-accent flex items-center justify-center">
                    <span className="text-xs text-accent-foreground font-medium">accent</span>
                  </div>
                  <p className="text-xs text-foreground-muted">#ff8000</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-success flex items-center justify-center">
                    <span className="text-xs text-success-foreground font-medium">success</span>
                  </div>
                  <p className="text-xs text-foreground-muted">green</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-warning flex items-center justify-center">
                    <span className="text-xs text-warning-foreground font-medium">warning</span>
                  </div>
                  <p className="text-xs text-foreground-muted">yellow</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-error flex items-center justify-center">
                    <span className="text-xs text-error-foreground font-medium">error</span>
                  </div>
                  <p className="text-xs text-foreground-muted">red</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-discord flex items-center justify-center">
                    <span className="text-xs text-discord-foreground font-medium">discord</span>
                  </div>
                  <p className="text-xs text-foreground-muted">#5865F2</p>
                </div>
              </div>
            </div>

            {/* Text Colors */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Text</h3>
              <div className="flex gap-8">
                <div className="space-y-1">
                  <p className="text-foreground font-medium">Primary Text</p>
                  <p className="text-xs text-foreground-muted">foreground</p>
                </div>
                <div className="space-y-1">
                  <p className="text-foreground-secondary font-medium">Secondary Text</p>
                  <p className="text-xs text-foreground-muted">foreground-secondary</p>
                </div>
                <div className="space-y-1">
                  <p className="text-foreground-muted font-medium">Muted Text</p>
                  <p className="text-xs text-foreground-muted">foreground-muted</p>
                </div>
                <div className="space-y-1">
                  <p className="text-accent font-medium">Accent Text</p>
                  <p className="text-xs text-foreground-muted">accent (links)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Typography</h2>
          <p className="text-foreground-secondary">Poppins font family throughout</p>

          <div className="space-y-4 bg-background-elevated p-6 rounded-lg border border-border">
            <div className="space-y-1">
              <p className="text-5xl font-bold">Hero Heading (42px Bold)</p>
              <p className="text-xs text-foreground-muted">text-5xl font-bold</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold">Page Heading (24px Bold)</p>
              <p className="text-xs text-foreground-muted">text-3xl font-bold</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold">Section Heading (20px Semibold)</p>
              <p className="text-xs text-foreground-muted">text-2xl font-semibold</p>
            </div>
            <div className="space-y-1">
              <p className="text-lg">Body Large (16px Regular)</p>
              <p className="text-xs text-foreground-muted">text-lg</p>
            </div>
            <div className="space-y-1">
              <p className="text-base">Body (13px Regular) - Default for nav items and UI text</p>
              <p className="text-xs text-foreground-muted">text-base</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-foreground-secondary">Section Label</p>
              <p className="text-xs text-foreground-muted">text-xs font-medium uppercase tracking-wider (section-label class)</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Buttons</h2>
          <p className="text-foreground-secondary">Pill-shaped with gradient/depth styling</p>

          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Variants</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="link">Link Button</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Sizes</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><HugeiconsIcon icon={Settings01Icon} size={16} /></Button>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">With Icons</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary"><HugeiconsIcon icon={Add01Icon} size={16} /> Create New</Button>
                <Button variant="secondary"><HugeiconsIcon icon={Settings01Icon} size={16} /> Settings</Button>
                <Button variant="destructive"><HugeiconsIcon icon={Delete01Icon} size={16} /> Delete</Button>
                <Button variant="accent"><HugeiconsIcon icon={Tick01Icon} size={16} /> Approve</Button>
              </div>
            </div>

            {/* States */}
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">States</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary">Normal</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Inputs */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Form Inputs</h2>
            <p className="text-foreground-secondary">Consistent input styling with pill and rounded variants</p>
          </div>

          {/* Input Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Input Variants</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pill (Default)</Label>
                  <Input placeholder="Pill shaped input..." />
                </div>
                <div className="space-y-2">
                  <Label>Rounded</Label>
                  <Input variant="rounded" placeholder="Rounded corners..." />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Disabled</Label>
                  <Input placeholder="Disabled input" disabled />
                </div>
                <div className="space-y-2">
                  <Label>With Value</Label>
                  <Input defaultValue="Big Yikes" />
                </div>
              </div>
            </div>
          </div>

          {/* Input Sizes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Input Sizes</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label size="sm">Small (sm)</Label>
                <Input size="sm" placeholder="Small input..." />
              </div>
              <div className="space-y-2">
                <Label>Default</Label>
                <Input placeholder="Default input..." />
              </div>
              <div className="space-y-2">
                <Label size="lg">Large (lg)</Label>
                <Input size="lg" placeholder="Large input..." />
              </div>
            </div>
          </div>

          {/* Select */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Select</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Pill Select (Default)</Label>
                <Select>
                  <option>Select an option...</option>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rounded Select</Label>
                <Select variant="rounded">
                  <option>Select an option...</option>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Textarea</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Pill Textarea (Default)</Label>
                <Textarea placeholder="Enter your message..." />
              </div>
              <div className="space-y-2">
                <Label>Rounded Textarea</Label>
                <Textarea variant="rounded" placeholder="Enter your message..." />
              </div>
            </div>
          </div>
        </section>

        {/* Modals */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Modals</h2>
            <p className="text-foreground-secondary">Composable modal system with consistent styling</p>
          </div>

          {/* Modal Sizes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Modal Sizes</h3>
            <div className="flex flex-wrap gap-3">
              {(['sm', 'default', 'lg', 'xl', 'full'] as const).map((size) => (
                <Button
                  key={size}
                  variant={modalSize === size ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setModalSize(size);
                    setDemoModalOpen(true);
                  }}
                >
                  {size === 'sm' ? 'Small (max-w-md)' :
                   size === 'default' ? 'Default (max-w-lg)' :
                   size === 'lg' ? 'Large (max-w-2xl)' :
                   size === 'xl' ? 'XL (max-w-3xl)' :
                   'Full (max-w-4xl)'}
                </Button>
              ))}
            </div>
          </div>

          {/* Modal Components */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Modal Components</h3>
            <div className="bg-background-elevated border border-border-strong rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border-strong bg-background-subtle">
                <code className="text-sm text-accent">{'<Modal open={} onClose={} size="default">'}</code>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <p><code className="text-accent">ModalHeader</code> - Header with title, description, and close button</p>
                <p><code className="text-accent">ModalTitle</code> - Styled h2 heading</p>
                <p><code className="text-accent">ModalDescription</code> - Muted description text</p>
                <p><code className="text-accent">ModalBody</code> - Scrollable content area</p>
                <p><code className="text-accent">ModalFooter</code> - Footer with action buttons</p>
              </div>
            </div>
          </div>

          {/* Demo Modal */}
          <Modal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} size={modalSize}>
            <ModalHeader onClose={() => setDemoModalOpen(false)}>
              <ModalTitle>Demo Modal ({modalSize})</ModalTitle>
              <ModalDescription>This is a demonstration of the modal component</ModalDescription>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <p className="text-foreground-secondary">
                This modal uses the standardized Modal component system. It includes:
              </p>
              <ul className="list-disc list-inside text-foreground-secondary space-y-1">
                <li>Backdrop click to close</li>
                <li>Escape key to close</li>
                <li>Body scroll prevention</li>
                <li>Consistent header/body/footer styling</li>
                <li>Size variants (sm, default, lg, xl, full)</li>
              </ul>
              <div className="space-y-2">
                <Label>Example Input</Label>
                <Input placeholder="Type something..." />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setDemoModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDemoModalOpen(false)}>
                Confirm
              </Button>
            </ModalFooter>
          </Modal>
        </section>

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Cards</h2>
          <p className="text-foreground-secondary">Elevated surfaces with subtle borders</p>

          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>A simple card with header and content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground-secondary">Card content goes here. This uses the elevated background token.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
                <CardDescription>With footer actions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground-secondary">Some content that describes what this card is about.</p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="secondary" size="sm">Cancel</Button>
                <Button variant="primary" size="sm">Save</Button>
              </CardFooter>
            </Card>

            <Card className="border-accent/30 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-accent">Accent Card</CardTitle>
                <CardDescription>Highlighted with accent color</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground-secondary">Special emphasis card using accent border.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Badges</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Standard Badges</h3>
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Submission Status Badges</h3>
              <div className="flex flex-wrap gap-3">
                <StatusBadge status="approved" />
                <StatusBadge status="pending" />
                <StatusBadge status="needs_revision" />
                <StatusBadge status="rejected" />
                <StatusBadge status="draft" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Attendance Status Badges</h3>
              <div className="flex flex-wrap gap-3">
                <StatusBadge status="attended" />
                <StatusBadge status="late" />
                <StatusBadge status="benched" />
                <StatusBadge status="signed_up" />
                <StatusBadge status="no_show" />
                <StatusBadge status="excused" />
              </div>
            </div>
          </div>
        </section>

        {/* Nav Item Example */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Navigation Items</h2>
          <p className="text-foreground-secondary">Active state uses orange accent with subtle background</p>

          <div className="bg-background-subtle p-4 rounded-lg max-w-xs space-y-2">
            <div className="nav-item-active flex items-center gap-3 px-3.5 py-2.5 rounded-full">
              <HugeiconsIcon icon={DashboardSquare02Icon} size={20} />
              <span className="text-base font-medium">Overview</span>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-full text-foreground hover:bg-background-elevated transition-colors cursor-pointer">
              <HugeiconsIcon icon={GoogleSheetIcon} size={20} />
              <span className="text-base font-medium">Master Sheet</span>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-full text-foreground hover:bg-background-elevated transition-colors cursor-pointer">
              <HugeiconsIcon icon={Task01Icon} size={20} />
              <span className="text-base font-medium">Loot Lists</span>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-full text-foreground hover:bg-background-elevated transition-colors cursor-pointer">
              <HugeiconsIcon icon={ScrollIcon} size={20} />
              <span className="text-base font-medium">Attendance</span>
            </div>
          </div>
        </section>

        {/* Selector Card Example (from Figma) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Selector Cards</h2>
          <p className="text-foreground-secondary">Guild/Character selector style from Figma</p>

          <div className="bg-background-subtle p-4 rounded-lg max-w-xs space-y-3">
            <div>
              <p className="section-label px-3 mb-1">Current Guild</p>
              <div className="card-gradient flex items-center gap-3 px-3.5 py-2 cursor-pointer hover:border-border-strong transition-colors">
                <div className="w-5 h-5 rounded bg-foreground-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground truncate">Big Yikes</p>
                  <p className="text-xs text-foreground-secondary">Pagle • Alliance</p>
                </div>
                <HugeiconsIcon icon={ArrowDown01Icon} size={20} className="text-foreground-secondary" />
              </div>
            </div>

            <div>
              <p className="section-label px-3 mb-1">Character</p>
              <div className="card-gradient flex items-center gap-3 px-3.5 py-2 cursor-pointer hover:border-border-strong transition-colors">
                <div className="w-5 h-5 rounded-full bg-class-warrior" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-class-warrior truncate">Zevinall</p>
                  <p className="text-xs text-foreground-secondary">Protection Warrior</p>
                </div>
                <HugeiconsIcon icon={ArrowDown01Icon} size={20} className="text-foreground-secondary" />
              </div>
            </div>
          </div>
        </section>

        {/* WoW Class Colors */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">WoW Class Colors</h2>
          <p className="text-foreground-secondary">For character name displays</p>

          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-warrior" />
              <span className="text-class-warrior text-sm">Warrior</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-paladin" />
              <span className="text-class-paladin text-sm">Paladin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-hunter" />
              <span className="text-class-hunter text-sm">Hunter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-rogue" />
              <span className="text-class-rogue text-sm">Rogue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-priest border border-border" />
              <span className="text-class-priest text-sm">Priest</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-deathknight" />
              <span className="text-class-deathknight text-sm">Death Knight</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-shaman" />
              <span className="text-class-shaman text-sm">Shaman</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-mage" />
              <span className="text-class-mage text-sm">Mage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-warlock" />
              <span className="text-class-warlock text-sm">Warlock</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-class-druid" />
              <span className="text-class-druid text-sm">Druid</span>
            </div>
          </div>
        </section>

        {/* Border Radius */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Border Radius</h2>

          <div className="flex flex-wrap gap-6 items-end">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-background-elevated border border-border rounded-sm" />
              <p className="text-xs text-foreground-muted">sm (4px)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-background-elevated border border-border rounded-md" />
              <p className="text-xs text-foreground-muted">md (8px)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-background-elevated border border-border rounded-lg" />
              <p className="text-xs text-foreground-muted">lg (12px)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-10 bg-background-elevated border border-border rounded-pill-sm" />
              <p className="text-xs text-foreground-muted">pill-sm (40px)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-24 h-11 bg-background-elevated border border-border rounded-pill" />
              <p className="text-xs text-foreground-muted">pill (52px)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-28 h-12 bg-background-elevated border border-border rounded-pill-lg" />
              <p className="text-xs text-foreground-muted">pill-lg (60px)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-background-elevated border border-border rounded-full" />
              <p className="text-xs text-foreground-muted">full</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-border">
          <p className="text-foreground-muted text-sm">
            LootList+ Design System • Poppins font • HugeIcons (Standard Stroke) • Dark-first with light mode support
          </p>
        </footer>
      </div>
    </div>
  );
}
