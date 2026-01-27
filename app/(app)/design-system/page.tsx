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
import { LoadingSpinner, Spinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Heading, Text, LabelText } from "@/components/ui/typography";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotification } from "@/app/contexts/NotificationContext";
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
  const [buttonLoading, setButtonLoading] = useState(false);
  const { showNotification } = useNotification();

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
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Typography</h2>
            <p className="text-foreground-secondary">Poppins font family with consistent sizing scale</p>
          </div>

          {/* Type Scale */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Type Scale</h3>
            <div className="bg-background-elevated p-6 rounded-xl border border-border space-y-4">
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-5xl font-bold">Page Title</span>
                <span className="text-xs text-muted-foreground">text-5xl (42px) font-bold</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-4xl font-bold">Large Heading</span>
                <span className="text-xs text-muted-foreground">text-4xl (32px) font-bold</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-3xl font-bold">Section Heading</span>
                <span className="text-xs text-muted-foreground">text-3xl (24px) font-bold</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-2xl font-semibold">Subsection</span>
                <span className="text-xs text-muted-foreground">text-2xl (20px) font-semibold</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-xl font-semibold">Card Title</span>
                <span className="text-xs text-muted-foreground">text-xl (18px) font-semibold</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-lg font-medium">Emphasized Text</span>
                <span className="text-xs text-muted-foreground">text-lg (16px) font-medium</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-md">Larger Body</span>
                <span className="text-xs text-muted-foreground">text-md (14px)</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-base">Default Body Text</span>
                <span className="text-xs text-muted-foreground">text-base (13px) - default</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="text-sm">Small Text / Labels</span>
                <span className="text-xs text-muted-foreground">text-sm (12px)</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs">Tiny Text / Badges</span>
                <span className="text-xs text-muted-foreground">text-xs (10px)</span>
              </div>
            </div>
          </div>

          {/* Heading Component */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Heading Component</h3>
            <p className="text-sm text-muted-foreground">Use the <code className="text-accent">Heading</code> component for semantic headings with consistent styling</p>
            <div className="bg-background-elevated p-6 rounded-xl border border-border space-y-4">
              <div className="space-y-1">
                <Heading level={1}>Heading Level 1</Heading>
                <p className="text-xs text-muted-foreground">{'<Heading level={1}>'} - Page titles (42px bold)</p>
              </div>
              <div className="space-y-1">
                <Heading level={2}>Heading Level 2</Heading>
                <p className="text-xs text-muted-foreground">{'<Heading level={2}>'} - Section headers (24px bold)</p>
              </div>
              <div className="space-y-1">
                <Heading level={3}>Heading Level 3</Heading>
                <p className="text-xs text-muted-foreground">{'<Heading level={3}>'} - Subsections (20px semibold)</p>
              </div>
              <div className="space-y-1">
                <Heading level={4}>Heading Level 4</Heading>
                <p className="text-xs text-muted-foreground">{'<Heading level={4}>'} - Small sections (18px semibold)</p>
              </div>
              <div className="space-y-1">
                <Heading level={5}>Heading Level 5</Heading>
                <p className="text-xs text-muted-foreground">{'<Heading level={5}>'} - Card titles (16px medium)</p>
              </div>
              <div className="space-y-1">
                <Heading level={6}>Heading Level 6</Heading>
                <p className="text-xs text-muted-foreground">{'<Heading level={6}>'} - Mini headers (13px medium)</p>
              </div>
            </div>
          </div>

          {/* Text Component */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Text Component</h3>
            <p className="text-sm text-muted-foreground">Use the <code className="text-accent">Text</code> component for body text with size, weight, and color variants</p>
            <div className="grid grid-cols-2 gap-6">
              {/* Sizes */}
              <div className="bg-background-elevated p-4 rounded-xl border border-border space-y-3">
                <LabelText>Sizes</LabelText>
                <div className="space-y-2">
                  <Text size="lg">Large text (16px)</Text>
                  <Text size="md">Medium text (14px)</Text>
                  <Text size="base">Base text (13px) - default</Text>
                  <Text size="sm">Small text (12px)</Text>
                  <Text size="xs">Tiny text (10px)</Text>
                </div>
              </div>

              {/* Colors */}
              <div className="bg-background-elevated p-4 rounded-xl border border-border space-y-3">
                <LabelText>Colors</LabelText>
                <div className="space-y-2">
                  <Text color="default">Default text</Text>
                  <Text color="secondary">Secondary text</Text>
                  <Text color="muted">Muted text</Text>
                  <Text color="accent">Accent text</Text>
                  <Text color="success">Success text</Text>
                  <Text color="destructive">Destructive text</Text>
                </div>
              </div>

              {/* Weights */}
              <div className="bg-background-elevated p-4 rounded-xl border border-border space-y-3">
                <LabelText>Weights</LabelText>
                <div className="space-y-2">
                  <Text weight="normal">Normal weight</Text>
                  <Text weight="medium">Medium weight</Text>
                  <Text weight="semibold">Semibold weight</Text>
                  <Text weight="bold">Bold weight</Text>
                </div>
              </div>

              {/* Label Text */}
              <div className="bg-background-elevated p-4 rounded-xl border border-border space-y-3">
                <LabelText>Section Labels</LabelText>
                <div className="space-y-3">
                  <div>
                    <LabelText size="xs">Extra Small Label</LabelText>
                    <p className="text-xs text-muted-foreground mt-1">10px uppercase tracking-wider</p>
                  </div>
                  <div>
                    <LabelText size="sm">Small Label</LabelText>
                    <p className="text-xs text-muted-foreground mt-1">12px uppercase tracking-wider</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Patterns */}
          <div className="bg-background-elevated p-4 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Usage Patterns</h3>
            <div className="space-y-2 text-sm">
              <p><code className="text-accent">{'<Heading level={1}>Page Title</Heading>'}</code></p>
              <p><code className="text-accent">{'<Heading level={2}>Section</Heading>'}</code></p>
              <p><code className="text-accent">{'<Heading level={3} as="h2">Visual h3, semantic h2</Heading>'}</code></p>
              <p><code className="text-accent">{'<Text size="sm" color="muted">Helper text</Text>'}</code></p>
              <p><code className="text-accent">{'<Text weight="semibold">Bold statement</Text>'}</code></p>
              <p><code className="text-accent">{'<LabelText>Section Label</LabelText>'}</code></p>
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

        {/* Loading States */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Loading States</h2>
            <p className="text-foreground-secondary">Consistent loading indicators and skeleton placeholders</p>
          </div>

          {/* Spinners */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Inline Spinner</h3>
            <p className="text-sm text-foreground-secondary">Simple SVG spinner for buttons and small contexts</p>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="text-xs text-foreground-muted">sm (14px)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="default" />
                <span className="text-xs text-foreground-muted">default (16px)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="text-xs text-foreground-muted">lg (20px)</span>
              </div>
            </div>
          </div>

          {/* LoadingSpinner with Icon */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Loading Spinner (Branded)</h3>
            <p className="text-sm text-foreground-secondary">Pulsing loot icon for page and content loading</p>
            <div className="flex items-end gap-12">
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-xs text-foreground-muted">sm (24px)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="default" />
                <span className="text-xs text-foreground-muted">default (48px)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="lg" />
                <span className="text-xs text-foreground-muted">lg (64px)</span>
              </div>
            </div>
            <div className="mt-4">
              <LoadingSpinner size="sm" text="Loading items..." />
            </div>
          </div>

          {/* Button Loading States */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Button Loading States</h3>
            <p className="text-sm text-foreground-secondary">Use the <code className="text-accent">loading</code> prop to show a spinner and disable the button</p>
            <div className="flex flex-wrap gap-4 items-center">
              <Button
                variant="primary"
                loading={buttonLoading}
                onClick={() => {
                  setButtonLoading(true);
                  setTimeout(() => setButtonLoading(false), 2000);
                }}
              >
                {buttonLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="secondary" loading>Processing</Button>
              <Button variant="destructive" loading>Deleting</Button>
              <Button variant="accent" loading>Approving</Button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <Button size="sm" loading>Small</Button>
              <Button size="default" loading>Default</Button>
              <Button size="lg" loading>Large</Button>
            </div>
          </div>

          {/* Skeleton Loaders */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Skeleton Loaders</h3>
            <p className="text-sm text-foreground-secondary">Placeholder shapes with shimmer animation for content loading</p>
            <div className="grid grid-cols-2 gap-6">
              {/* Text Skeletons */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground-secondary">Text Placeholders</h4>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>

              {/* Card Skeleton */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground-secondary">Card Placeholder</h4>
                <div className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Table Row Skeleton */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground-secondary">Table Row Placeholder</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border-b border-border last:border-b-0">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16 rounded-full ml-auto" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Avatar Group */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground-secondary">Avatar Placeholders</h4>
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Usage Patterns */}
          <div className="bg-background-elevated p-4 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Usage Patterns</h3>
            <div className="space-y-2 text-sm">
              <p><code className="text-accent">{'<LoadingSpinner />'}</code> - Full page or content area loading</p>
              <p><code className="text-accent">{'<LoadingSpinner size="sm" text="Loading..." />'}</code> - Smaller context with message</p>
              <p><code className="text-accent">{'<Button loading>Save</Button>'}</code> - Button with spinner</p>
              <p><code className="text-accent">{'<Skeleton className="h-4 w-48" />'}</code> - Text placeholder</p>
              <p><code className="text-accent">{'<Skeleton className="h-10 w-10 rounded-full" />'}</code> - Avatar placeholder</p>
            </div>
          </div>
        </section>

        {/* Empty States */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Empty States</h2>
            <p className="text-foreground-secondary">Consistent messaging for empty data and no results</p>
          </div>

          {/* Size Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Size Variants</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-2 bg-background-subtle text-xs text-muted-foreground text-center border-b border-border">compact</div>
                <EmptyState
                  icon={ScrollIcon}
                  title="No items yet"
                  description="Items will appear here"
                  size="compact"
                />
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-2 bg-background-subtle text-xs text-muted-foreground text-center border-b border-border">default</div>
                <EmptyState
                  icon={ScrollIcon}
                  title="No items found"
                  description="Try adjusting your filters"
                  size="default"
                />
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-2 bg-background-subtle text-xs text-muted-foreground text-center border-b border-border">lg</div>
                <EmptyState
                  icon={ScrollIcon}
                  title="No results"
                  description="We couldn't find what you're looking for"
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Card Variant */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Card Variant</h3>
            <p className="text-sm text-foreground-secondary">Use <code className="text-accent">variant="card"</code> for elevated background with border</p>
            <EmptyState
              icon={CheckmarkCircle01Icon}
              title="All caught up!"
              description="No pending items to review"
              size="lg"
              variant="card"
            />
          </div>

          {/* With Action */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">With Action Button</h3>
            <EmptyState
              icon={Add01Icon}
              title="No characters yet"
              description="Create your first character to get started"
              action={{
                label: "Create Character",
                onClick: () => {},
                variant: "primary"
              }}
              variant="card"
            />
          </div>

          {/* Usage Patterns */}
          <div className="bg-background-elevated p-4 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Usage Patterns</h3>
            <div className="space-y-2 text-sm">
              <p><code className="text-accent">{'<EmptyState icon={Icon} title="Title" />'}</code> - Basic empty state</p>
              <p><code className="text-accent">{'<EmptyState ... description="..." />'}</code> - With description</p>
              <p><code className="text-accent">{'<EmptyState ... size="compact" />'}</code> - For inline/table contexts</p>
              <p><code className="text-accent">{'<EmptyState ... variant="card" />'}</code> - With card background</p>
              <p><code className="text-accent">{'<EmptyState ... action={{ label, onClick }} />'}</code> - With CTA button</p>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Spacing</h2>
            <p className="text-foreground-secondary">Consistent spacing scale for padding, margins, and gaps</p>
          </div>

          {/* Spacing Scale */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Spacing Scale</h3>
            <div className="bg-background-elevated p-6 rounded-xl border border-border">
              <div className="space-y-3">
                {[
                  { name: '1', value: '4px', tailwind: 'p-1, gap-1, space-y-1' },
                  { name: '2', value: '8px', tailwind: 'p-2, gap-2, space-y-2' },
                  { name: '3', value: '12px', tailwind: 'p-3, gap-3, space-y-3' },
                  { name: '4', value: '16px', tailwind: 'p-4, gap-4, space-y-4' },
                  { name: '5', value: '20px', tailwind: 'p-5, gap-5, space-y-5' },
                  { name: '6', value: '24px', tailwind: 'p-6, gap-6, space-y-6' },
                  { name: '8', value: '32px', tailwind: 'p-8, gap-8, space-y-8' },
                  { name: '10', value: '40px', tailwind: 'p-10, gap-10' },
                  { name: '12', value: '48px', tailwind: 'p-12, gap-12' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <div
                      className="bg-accent h-4 rounded"
                      style={{ width: item.value }}
                    />
                    <span className="text-sm font-medium w-8">{item.name}</span>
                    <span className="text-sm text-muted-foreground w-16">{item.value}</span>
                    <span className="text-xs text-muted-foreground">{item.tailwind}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Common Patterns */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Common Patterns</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Page Layout */}
              <div className="space-y-3">
                <LabelText>Page Layout</LabelText>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-accent/20 p-8">
                    <div className="bg-background-elevated rounded-lg p-4 text-center text-sm text-muted-foreground">
                      Content with p-8 page padding
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Page content: <code className="text-accent">p-8</code> (32px)</p>
              </div>

              {/* Card Padding */}
              <div className="space-y-3">
                <LabelText>Card Padding</LabelText>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-accent/20 p-6">
                    <div className="bg-background-elevated rounded-lg p-4 text-center text-sm text-muted-foreground">
                      Card content with p-6
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Cards/Modals: <code className="text-accent">p-6</code> (24px)</p>
              </div>

              {/* Section Spacing */}
              <div className="space-y-3">
                <LabelText>Section Spacing</LabelText>
                <div className="border border-border rounded-xl p-4 space-y-4">
                  <div className="bg-accent/20 rounded p-3 text-center text-xs">Section 1</div>
                  <div className="bg-accent/20 rounded p-3 text-center text-xs">Section 2</div>
                  <div className="bg-accent/20 rounded p-3 text-center text-xs">Section 3</div>
                </div>
                <p className="text-xs text-muted-foreground">Between sections: <code className="text-accent">space-y-4</code> or <code className="text-accent">space-y-6</code></p>
              </div>

              {/* Flex Gap */}
              <div className="space-y-3">
                <LabelText>Flex/Grid Gap</LabelText>
                <div className="border border-border rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="bg-accent/20 rounded p-3 text-center text-xs flex-1">Item</div>
                    <div className="bg-accent/20 rounded p-3 text-center text-xs flex-1">Item</div>
                    <div className="bg-accent/20 rounded p-3 text-center text-xs flex-1">Item</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Flex items: <code className="text-accent">gap-2</code>, <code className="text-accent">gap-3</code>, or <code className="text-accent">gap-4</code></p>
              </div>
            </div>
          </div>

          {/* Spacing Guidelines */}
          <div className="bg-background-elevated p-4 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Guidelines</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><strong className="text-foreground">Page padding:</strong> <code className="text-accent">p-8</code> (32px)</p>
                <p><strong className="text-foreground">Card/Modal padding:</strong> <code className="text-accent">p-6</code> (24px)</p>
                <p><strong className="text-foreground">Compact containers:</strong> <code className="text-accent">p-4</code> (16px)</p>
                <p><strong className="text-foreground">Inline elements:</strong> <code className="text-accent">p-2</code> or <code className="text-accent">p-3</code></p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-foreground">Page sections:</strong> <code className="text-accent">space-y-6</code> (24px)</p>
                <p><strong className="text-foreground">Card sections:</strong> <code className="text-accent">space-y-4</code> (16px)</p>
                <p><strong className="text-foreground">Tight lists:</strong> <code className="text-accent">space-y-2</code> (8px)</p>
                <p><strong className="text-foreground">Flex items:</strong> <code className="text-accent">gap-2</code> to <code className="text-accent">gap-4</code></p>
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

        {/* Toast & Notifications */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Toast & Notifications</h2>
            <p className="text-foreground-secondary">Feedback messages for user actions</p>
          </div>

          {/* Toast Notifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Toast Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Use <code className="text-accent">useNotification()</code> hook for global toast messages
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="success"
                size="sm"
                onClick={() => showNotification('success', 'Changes saved successfully!')}
              >
                Show Success
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => showNotification('error', 'Something went wrong. Please try again.')}
              >
                Show Error
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => showNotification('warning', 'Your session will expire soon.')}
              >
                Show Warning
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => showNotification('info', 'New features are available!')}
              >
                Show Info
              </Button>
            </div>
          </div>

          {/* Inline Alerts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Inline Alerts</h3>
            <p className="text-sm text-muted-foreground">
              Use <code className="text-accent">Alert</code> component for persistent inline messages
            </p>
            <div className="space-y-3">
              <Alert variant="success">
                <AlertDescription>Your loot list has been submitted for review.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertDescription>Failed to save changes. Please check your connection.</AlertDescription>
              </Alert>
              <Alert variant="warning">
                <AlertDescription>This action cannot be undone.</AlertDescription>
              </Alert>
              <Alert variant="info">
                <AlertDescription>Tip: You can drag items to reorder your priority list.</AlertDescription>
              </Alert>
              <Alert variant="default">
                <AlertDescription>No pending submissions to review.</AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Usage Patterns */}
          <div className="bg-background-elevated p-4 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wider">Usage Patterns</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-foreground mb-1">Toast (temporary, auto-dismiss):</p>
                <code className="text-accent text-xs">{"const { showNotification } = useNotification()"}</code>
                <br />
                <code className="text-accent text-xs">{"showNotification('success', 'Saved!')"}</code>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Alert (persistent, inline):</p>
                <code className="text-accent text-xs">{'<Alert variant="success"><AlertDescription>Message</AlertDescription></Alert>'}</code>
              </div>
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
