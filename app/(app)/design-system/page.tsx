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
  RefreshIcon,
  Logout01Icon,
  Login01Icon,
} from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";

// Navigation structure
const navSections = [
  {
    title: "Foundations",
    items: [
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
      { id: "spacing", label: "Spacing" },
      { id: "icons", label: "Icons" },
      { id: "border-radius", label: "Border Radius" },
    ]
  },
  {
    title: "Components",
    items: [
      { id: "buttons", label: "Buttons" },
      { id: "form-inputs", label: "Form Inputs" },
      { id: "cards", label: "Cards" },
      { id: "modals", label: "Modals" },
      { id: "badges", label: "Badges" },
    ]
  },
  {
    title: "Feedback",
    items: [
      { id: "loading-states", label: "Loading States" },
      { id: "empty-states", label: "Empty States" },
      { id: "toasts", label: "Toast & Alerts" },
    ]
  },
  {
    title: "Patterns",
    items: [
      { id: "navigation", label: "Navigation" },
      { id: "selector-cards", label: "Selector Cards" },
      { id: "wow-classes", label: "WoW Class Colors" },
    ]
  }
];

// Section wrapper component for consistent styling
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      {children}
    </section>
  );
}

// Section header component
function SectionHeader({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      {description && (
        <p className="text-foreground-secondary mt-1">{description}</p>
      )}
    </div>
  );
}

// Subsection header
function SubsectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

// Preview card for component examples
function PreviewCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-background-elevated border border-border rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

// Code block
function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-4 mt-4">
      <code className="text-sm text-accent">{children}</code>
    </div>
  );
}

export default function DesignSystemPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'default' | 'lg' | 'xl' | 'full'>('default');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("colors");
  const { showNotification } = useNotification();

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -80% 0px" }
    );

    navSections.forEach((section) => {
      section.items.forEach((item) => {
        const element = document.getElementById(item.id);
        if (element) observer.observe(element);
      });
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Design System</h1>
            <p className="text-sm text-muted-foreground">LootList+ Component Library</p>
          </div>
          <div className="flex items-center gap-3">
            <HugeiconsIcon icon={Sun01Icon} size={16} className="text-foreground-secondary" />
            <Switch checked={darkMode} onCheckedChange={toggleTheme} />
            <HugeiconsIcon icon={Moon02Icon} size={16} className="text-foreground-secondary" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-16 pt-8 pl-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="space-y-6">
              {navSections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {section.title}
                  </h4>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`text-left py-1.5 text-sm transition-colors ${
                            activeSection === item.id
                              ? "text-accent font-medium"
                              : "text-foreground-secondary hover:text-foreground"
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-8 py-8 space-y-16 min-w-0">

          {/* ============================================== */}
          {/* FOUNDATIONS */}
          {/* ============================================== */}

          {/* Colors */}
          <Section id="colors">
            <SectionHeader
              title="Colors"
              description="Semantic color tokens for consistent theming across light and dark modes"
            />

            <div className="space-y-8">
              {/* Backgrounds */}
              <div>
                <SubsectionHeader title="Backgrounds" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="h-20 rounded-xl bg-background border border-border flex items-center justify-center">
                      <span className="text-xs text-foreground-secondary">background</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Base page background</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-xl bg-background-subtle border border-border flex items-center justify-center">
                      <span className="text-xs text-foreground-secondary">background-subtle</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Sidebar, secondary areas</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-xl bg-background-elevated border border-border flex items-center justify-center">
                      <span className="text-xs text-foreground-secondary">background-elevated</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Cards, modals, dropdowns</p>
                  </div>
                </div>
              </div>

              {/* Accent & Status */}
              <div>
                <SubsectionHeader title="Accent & Status" />
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { name: 'accent', bg: 'bg-accent', fg: 'text-accent-foreground', desc: 'Primary brand', hex: '#ff8000' },
                    { name: 'success', bg: 'bg-success', fg: 'text-success-foreground', desc: 'Positive actions', hex: 'green' },
                    { name: 'warning', bg: 'bg-warning', fg: 'text-warning-foreground', desc: 'Caution states', hex: 'yellow' },
                    { name: 'error', bg: 'bg-error', fg: 'text-error-foreground', desc: 'Destructive actions', hex: 'red' },
                    { name: 'discord', bg: 'bg-discord', fg: 'text-discord-foreground', desc: 'Discord integration', hex: '#5865F2' },
                  ].map((color) => (
                    <div key={color.name} className="space-y-2">
                      <div className={`h-16 rounded-xl ${color.bg} flex items-center justify-center`}>
                        <span className={`text-xs font-medium ${color.fg}`}>{color.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{color.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Text Colors */}
              <div>
                <SubsectionHeader title="Text Colors" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-8">
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">Primary Text</p>
                      <code className="text-xs text-muted-foreground">text-foreground</code>
                    </div>
                    <div className="space-y-1">
                      <p className="text-foreground-secondary font-medium">Secondary Text</p>
                      <code className="text-xs text-muted-foreground">text-foreground-secondary</code>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium">Muted Text</p>
                      <code className="text-xs text-muted-foreground">text-muted-foreground</code>
                    </div>
                    <div className="space-y-1">
                      <p className="text-accent font-medium">Accent Text</p>
                      <code className="text-xs text-muted-foreground">text-accent</code>
                    </div>
                  </div>
                </PreviewCard>
              </div>
            </div>
          </Section>

          {/* Typography */}
          <Section id="typography">
            <SectionHeader
              title="Typography"
              description="Poppins font family with a consistent sizing scale"
            />

            <div className="space-y-8">
              {/* Type Scale */}
              <div>
                <SubsectionHeader title="Type Scale" />
                <PreviewCard>
                  <div className="space-y-4">
                    {[
                      { text: 'Page Title', class: 'text-5xl font-bold', size: '42px' },
                      { text: 'Large Heading', class: 'text-4xl font-bold', size: '32px' },
                      { text: 'Section Heading', class: 'text-3xl font-bold', size: '24px' },
                      { text: 'Subsection', class: 'text-2xl font-semibold', size: '20px' },
                      { text: 'Card Title', class: 'text-xl font-semibold', size: '18px' },
                      { text: 'Emphasized Text', class: 'text-lg font-medium', size: '16px' },
                      { text: 'Larger Body', class: 'text-md', size: '14px' },
                      { text: 'Default Body Text', class: 'text-base', size: '13px' },
                      { text: 'Small Text / Labels', class: 'text-sm', size: '12px' },
                      { text: 'Tiny Text / Badges', class: 'text-xs', size: '10px' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-baseline justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                        <span className={item.class}>{item.text}</span>
                        <span className="text-xs text-muted-foreground">{item.class} ({item.size})</span>
                      </div>
                    ))}
                  </div>
                </PreviewCard>
              </div>

              {/* Heading Component */}
              <div>
                <SubsectionHeader
                  title="Heading Component"
                  description="Semantic headings with automatic styling"
                />
                <PreviewCard>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <div key={level} className="flex items-baseline justify-between">
                        <Heading level={level as 1 | 2 | 3 | 4 | 5 | 6}>Heading Level {level}</Heading>
                        <code className="text-xs text-muted-foreground">{`<Heading level={${level}}>`}</code>
                      </div>
                    ))}
                  </div>
                </PreviewCard>
              </div>

              {/* Text Component */}
              <div>
                <SubsectionHeader
                  title="Text Component"
                  description="Body text with size, weight, and color variants"
                />
                <div className="grid grid-cols-3 gap-4">
                  <PreviewCard>
                    <LabelText className="mb-3">Sizes</LabelText>
                    <div className="space-y-2">
                      <Text size="lg">Large (16px)</Text>
                      <Text size="md">Medium (14px)</Text>
                      <Text size="base">Base (13px)</Text>
                      <Text size="sm">Small (12px)</Text>
                      <Text size="xs">Tiny (10px)</Text>
                    </div>
                  </PreviewCard>
                  <PreviewCard>
                    <LabelText className="mb-3">Colors</LabelText>
                    <div className="space-y-2">
                      <Text color="default">Default</Text>
                      <Text color="secondary">Secondary</Text>
                      <Text color="muted">Muted</Text>
                      <Text color="accent">Accent</Text>
                      <Text color="success">Success</Text>
                      <Text color="destructive">Destructive</Text>
                    </div>
                  </PreviewCard>
                  <PreviewCard>
                    <LabelText className="mb-3">Weights</LabelText>
                    <div className="space-y-2">
                      <Text weight="normal">Normal</Text>
                      <Text weight="medium">Medium</Text>
                      <Text weight="semibold">Semibold</Text>
                      <Text weight="bold">Bold</Text>
                    </div>
                  </PreviewCard>
                </div>
              </div>

              {/* Label Text */}
              <div>
                <SubsectionHeader title="Label Text" description="Uppercase labels for sections and forms" />
                <PreviewCard>
                  <div className="flex gap-8">
                    <div>
                      <LabelText size="xs">Extra Small</LabelText>
                      <p className="text-xs text-muted-foreground mt-1">10px uppercase</p>
                    </div>
                    <div>
                      <LabelText size="sm">Small</LabelText>
                      <p className="text-xs text-muted-foreground mt-1">12px uppercase</p>
                    </div>
                  </div>
                </PreviewCard>
              </div>
            </div>
          </Section>

          {/* Spacing */}
          <Section id="spacing">
            <SectionHeader
              title="Spacing"
              description="Consistent spacing scale for padding, margins, and gaps"
            />

            <div className="space-y-8">
              {/* Scale */}
              <div>
                <SubsectionHeader title="Spacing Scale" />
                <PreviewCard>
                  <div className="space-y-3">
                    {[
                      { name: '1', value: '4px', usage: 'Tight inline spacing' },
                      { name: '2', value: '8px', usage: 'Compact element gaps' },
                      { name: '3', value: '12px', usage: 'Standard element gaps' },
                      { name: '4', value: '16px', usage: 'Card content, form fields' },
                      { name: '6', value: '24px', usage: 'Card padding, modal sections' },
                      { name: '8', value: '32px', usage: 'Page padding, major sections' },
                      { name: '12', value: '48px', usage: 'Page section dividers' },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center gap-4">
                        <div className="bg-accent h-4 rounded" style={{ width: item.value }} />
                        <span className="text-sm font-medium w-8">{item.name}</span>
                        <span className="text-sm text-muted-foreground w-16">{item.value}</span>
                        <span className="text-xs text-muted-foreground">{item.usage}</span>
                      </div>
                    ))}
                  </div>
                </PreviewCard>
              </div>

              {/* Common Patterns */}
              <div>
                <SubsectionHeader title="Common Patterns" />
                <div className="grid grid-cols-2 gap-4">
                  <PreviewCard>
                    <LabelText className="mb-3">Page Layout</LabelText>
                    <div className="border border-dashed border-accent/50 rounded-lg">
                      <div className="bg-accent/10 p-8">
                        <div className="bg-background rounded text-center py-4 text-sm text-muted-foreground">
                          Content area with p-8
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Page content: <code className="text-accent">p-8</code> (32px)</p>
                  </PreviewCard>
                  <PreviewCard>
                    <LabelText className="mb-3">Card Padding</LabelText>
                    <div className="border border-dashed border-accent/50 rounded-lg">
                      <div className="bg-accent/10 p-6">
                        <div className="bg-background rounded text-center py-4 text-sm text-muted-foreground">
                          Card with p-6
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Cards/Modals: <code className="text-accent">p-6</code> (24px)</p>
                  </PreviewCard>
                </div>
              </div>

              {/* Guidelines */}
              <PreviewCard className="bg-background">
                <LabelText className="mb-4">Quick Reference</LabelText>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><strong>Page padding:</strong> <code className="text-accent">p-8</code></p>
                    <p><strong>Card/Modal padding:</strong> <code className="text-accent">p-6</code></p>
                    <p><strong>Compact containers:</strong> <code className="text-accent">p-4</code></p>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Page sections:</strong> <code className="text-accent">space-y-6</code></p>
                    <p><strong>Card sections:</strong> <code className="text-accent">space-y-4</code></p>
                    <p><strong>Inline elements:</strong> <code className="text-accent">gap-2</code> to <code className="text-accent">gap-4</code></p>
                  </div>
                </div>
              </PreviewCard>
            </div>
          </Section>

          {/* Icons */}
          <Section id="icons">
            <SectionHeader
              title="Icons"
              description="HugeIcons Standard Stroke style, matching Figma designs"
            />

            <div className="space-y-8">
              {/* Navigation Icons */}
              <div>
                <SubsectionHeader title="Navigation" />
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: DashboardSquare02Icon, label: 'Overview' },
                    { icon: GoogleSheetIcon, label: 'Master Sheet' },
                    { icon: Task01Icon, label: 'Loot Lists' },
                    { icon: ScrollIcon, label: 'Attendance' },
                    { icon: Configuration01Icon, label: 'Settings' },
                    { icon: EditTableIcon, label: 'Submissions' },
                    { icon: CheckListIcon, label: 'Raid Tracking' },
                    { icon: HelpCircleIcon, label: 'Help' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-elevated border border-border min-w-[90px]">
                      <HugeiconsIcon icon={Icon} size={20} className="text-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Actions */}
              <div>
                <SubsectionHeader title="Common Actions" />
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: Add01Icon, label: 'Add' },
                    { icon: Delete01Icon, label: 'Delete' },
                    { icon: Edit01Icon, label: 'Edit' },
                    { icon: Tick01Icon, label: 'Tick' },
                    { icon: Cancel01Icon, label: 'Cancel' },
                    { icon: Copy01Icon, label: 'Copy' },
                    { icon: Download01Icon, label: 'Download' },
                    { icon: Upload01Icon, label: 'Upload' },
                    { icon: Share01Icon, label: 'Share' },
                    { icon: Link01Icon, label: 'Link' },
                    { icon: RefreshIcon, label: 'Refresh' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-elevated border border-border w-16">
                      <HugeiconsIcon icon={Icon} size={20} className="text-foreground" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Icons */}
              <div>
                <SubsectionHeader title="Status & Feedback" />
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-elevated border border-border">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-success" />
                    <span className="text-xs text-muted-foreground">Success</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-elevated border border-border">
                    <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-warning" />
                    <span className="text-xs text-muted-foreground">Warning</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-elevated border border-border">
                    <HugeiconsIcon icon={Cancel01Icon} size={20} className="text-error" />
                    <span className="text-xs text-muted-foreground">Error</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-elevated border border-border">
                    <HugeiconsIcon icon={InformationCircleIcon} size={20} className="text-info" />
                    <span className="text-xs text-muted-foreground">Info</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-elevated border border-border">
                    <Spinner size="lg" className="text-foreground-secondary" />
                    <span className="text-xs text-muted-foreground">Loading</span>
                  </div>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <SubsectionHeader title="Icon Sizes" />
                <PreviewCard>
                  <div className="flex items-end gap-8">
                    {[
                      { size: 16, label: '16px' },
                      { size: 20, label: '20px (default)' },
                      { size: 24, label: '24px' },
                      { size: 32, label: '32px' },
                    ].map((item) => (
                      <div key={item.size} className="flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={Settings01Icon} size={item.size} className="text-foreground" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </PreviewCard>
              </div>

              <CodeBlock>{`import { Settings01Icon } from "@hugeicons/core-free-icons"`}</CodeBlock>
            </div>
          </Section>

          {/* Border Radius */}
          <Section id="border-radius">
            <SectionHeader
              title="Border Radius"
              description="Consistent corner rounding for different contexts"
            />

            <PreviewCard>
              <div className="flex flex-wrap gap-6 items-end">
                {[
                  { class: 'rounded-sm', label: 'sm (4px)', w: 'w-16 h-16' },
                  { class: 'rounded-md', label: 'md (8px)', w: 'w-16 h-16' },
                  { class: 'rounded-lg', label: 'lg (12px)', w: 'w-16 h-16' },
                  { class: 'rounded-xl', label: 'xl (16px)', w: 'w-16 h-16' },
                  { class: 'rounded-pill-sm', label: 'pill-sm', w: 'w-20 h-10' },
                  { class: 'rounded-pill', label: 'pill', w: 'w-24 h-11' },
                  { class: 'rounded-full', label: 'full', w: 'w-16 h-16' },
                ].map((item) => (
                  <div key={item.class} className="text-center space-y-2">
                    <div className={`${item.w} bg-accent/20 border border-accent/40 ${item.class}`} />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </PreviewCard>
          </Section>

          {/* ============================================== */}
          {/* COMPONENTS */}
          {/* ============================================== */}

          {/* Buttons */}
          <Section id="buttons">
            <SectionHeader
              title="Buttons"
              description="Pill-shaped buttons with gradient and depth styling"
            />

            <div className="space-y-8">
              {/* Variants */}
              <div>
                <SubsectionHeader title="Variants" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="accent">Accent</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </PreviewCard>
              </div>

              {/* Sizes */}
              <div>
                <SubsectionHeader title="Sizes" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon"><HugeiconsIcon icon={Settings01Icon} size={16} /></Button>
                  </div>
                </PreviewCard>
              </div>

              {/* With Icons */}
              <div>
                <SubsectionHeader title="With Icons" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Button variant="primary"><HugeiconsIcon icon={Add01Icon} size={16} /> Create</Button>
                    <Button variant="secondary"><HugeiconsIcon icon={Settings01Icon} size={16} /> Settings</Button>
                    <Button variant="destructive"><HugeiconsIcon icon={Delete01Icon} size={16} /> Delete</Button>
                  </div>
                </PreviewCard>
              </div>

              {/* States */}
              <div>
                <SubsectionHeader title="States" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Button variant="primary">Normal</Button>
                    <Button variant="primary" disabled>Disabled</Button>
                    <Button
                      variant="primary"
                      loading={buttonLoading}
                      onClick={() => {
                        setButtonLoading(true);
                        setTimeout(() => setButtonLoading(false), 2000);
                      }}
                    >
                      {buttonLoading ? 'Loading...' : 'Click to Load'}
                    </Button>
                  </div>
                </PreviewCard>
              </div>
            </div>
          </Section>

          {/* Form Inputs */}
          <Section id="form-inputs">
            <SectionHeader
              title="Form Inputs"
              description="Consistent input styling with pill and rounded variants"
            />

            <div className="space-y-8">
              {/* Input Variants */}
              <div>
                <SubsectionHeader title="Input" />
                <div className="grid grid-cols-2 gap-4">
                  <PreviewCard>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pill (Default)</Label>
                        <Input placeholder="Enter text..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Rounded</Label>
                        <Input variant="rounded" placeholder="Enter text..." />
                      </div>
                    </div>
                  </PreviewCard>
                  <PreviewCard>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Disabled</Label>
                        <Input placeholder="Disabled" disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>With Value</Label>
                        <Input defaultValue="Big Yikes" />
                      </div>
                    </div>
                  </PreviewCard>
                </div>
              </div>

              {/* Input Sizes */}
              <div>
                <SubsectionHeader title="Input Sizes" />
                <PreviewCard>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label size="sm">Small</Label>
                      <Input size="sm" placeholder="Small..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Default</Label>
                      <Input placeholder="Default..." />
                    </div>
                    <div className="space-y-2">
                      <Label size="lg">Large</Label>
                      <Input size="lg" placeholder="Large..." />
                    </div>
                  </div>
                </PreviewCard>
              </div>

              {/* Select */}
              <div>
                <SubsectionHeader title="Select" />
                <PreviewCard>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pill Select</Label>
                      <Select>
                        <option>Select option...</option>
                        <option>Option 1</option>
                        <option>Option 2</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rounded Select</Label>
                      <Select variant="rounded">
                        <option>Select option...</option>
                        <option>Option 1</option>
                        <option>Option 2</option>
                      </Select>
                    </div>
                  </div>
                </PreviewCard>
              </div>

              {/* Textarea */}
              <div>
                <SubsectionHeader title="Textarea" />
                <PreviewCard>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pill Textarea</Label>
                      <Textarea placeholder="Enter message..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Rounded Textarea</Label>
                      <Textarea variant="rounded" placeholder="Enter message..." />
                    </div>
                  </div>
                </PreviewCard>
              </div>
            </div>
          </Section>

          {/* Cards */}
          <Section id="cards">
            <SectionHeader
              title="Cards"
              description="Elevated surfaces with subtle borders"
            />

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Card</CardTitle>
                  <CardDescription>Simple card with content</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary">Card content using elevated background.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>With Footer</CardTitle>
                  <CardDescription>Interactive card</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary">Some descriptive content here.</p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="secondary" size="sm">Cancel</Button>
                  <Button variant="primary" size="sm">Save</Button>
                </CardFooter>
              </Card>

              <Card className="border-accent/30 bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-accent">Accent Card</CardTitle>
                  <CardDescription>Highlighted emphasis</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary">Special card with accent border.</p>
                </CardContent>
              </Card>
            </div>
          </Section>

          {/* Modals */}
          <Section id="modals">
            <SectionHeader
              title="Modals"
              description="Composable modal system with consistent styling"
            />

            <div className="space-y-6">
              {/* Size Preview */}
              <div>
                <SubsectionHeader title="Modal Sizes" description="Click to preview different modal sizes" />
                <PreviewCard>
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
                        {size === 'sm' ? 'Small' : size === 'default' ? 'Default' : size === 'lg' ? 'Large' : size === 'xl' ? 'XL' : 'Full'}
                      </Button>
                    ))}
                  </div>
                </PreviewCard>
              </div>

              {/* Components */}
              <div>
                <SubsectionHeader title="Modal Components" />
                <PreviewCard className="bg-background">
                  <div className="space-y-2 text-sm">
                    <p><code className="text-accent">Modal</code> - Root component with backdrop and escape handling</p>
                    <p><code className="text-accent">ModalHeader</code> - Title, description, and close button</p>
                    <p><code className="text-accent">ModalBody</code> - Scrollable content area</p>
                    <p><code className="text-accent">ModalFooter</code> - Action buttons</p>
                  </div>
                </PreviewCard>
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
                  Modal features:
                </p>
                <ul className="list-disc list-inside text-foreground-secondary space-y-1">
                  <li>Backdrop click to close</li>
                  <li>Escape key to close</li>
                  <li>Body scroll prevention</li>
                  <li>Consistent styling</li>
                </ul>
                <div className="space-y-2">
                  <Label>Example Input</Label>
                  <Input placeholder="Type something..." />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="secondary" onClick={() => setDemoModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setDemoModalOpen(false)}>Confirm</Button>
              </ModalFooter>
            </Modal>
          </Section>

          {/* Badges */}
          <Section id="badges">
            <SectionHeader
              title="Badges"
              description="Status indicators and labels"
            />

            <div className="space-y-8">
              {/* Standard */}
              <div>
                <SubsectionHeader title="Standard Badges" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-3">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </PreviewCard>
              </div>

              {/* Status Badges */}
              <div>
                <SubsectionHeader title="Submission Status" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-3">
                    <StatusBadge status="approved" />
                    <StatusBadge status="pending" />
                    <StatusBadge status="needs_revision" />
                    <StatusBadge status="rejected" />
                    <StatusBadge status="draft" />
                  </div>
                </PreviewCard>
              </div>

              {/* Attendance Status */}
              <div>
                <SubsectionHeader title="Attendance Status" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-3">
                    <StatusBadge status="attended" />
                    <StatusBadge status="late" />
                    <StatusBadge status="benched" />
                    <StatusBadge status="signed_up" />
                    <StatusBadge status="no_show" />
                    <StatusBadge status="excused" />
                  </div>
                </PreviewCard>
              </div>
            </div>
          </Section>

          {/* ============================================== */}
          {/* FEEDBACK */}
          {/* ============================================== */}

          {/* Loading States */}
          <Section id="loading-states">
            <SectionHeader
              title="Loading States"
              description="Consistent loading indicators and skeleton placeholders"
            />

            <div className="space-y-8">
              {/* Spinners */}
              <div>
                <SubsectionHeader title="Inline Spinner" description="Simple SVG spinner for buttons and small contexts" />
                <PreviewCard>
                  <div className="flex items-center gap-8">
                    {[
                      { size: 'sm' as const, label: 'sm (14px)' },
                      { size: 'default' as const, label: 'default (16px)' },
                      { size: 'lg' as const, label: 'lg (20px)' },
                    ].map((item) => (
                      <div key={item.size} className="flex flex-col items-center gap-2">
                        <Spinner size={item.size} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </PreviewCard>
              </div>

              {/* Branded Spinner */}
              <div>
                <SubsectionHeader title="Loading Spinner (Branded)" description="Pulsing loot icon for page loading" />
                <PreviewCard>
                  <div className="flex items-end gap-12">
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-xs text-muted-foreground">sm (24px)</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner size="default" />
                      <span className="text-xs text-muted-foreground">default (48px)</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner size="lg" />
                      <span className="text-xs text-muted-foreground">lg (64px)</span>
                    </div>
                  </div>
                </PreviewCard>
              </div>

              {/* Button Loading */}
              <div>
                <SubsectionHeader title="Button Loading States" description="Use the loading prop for button spinners" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Button variant="primary" loading>Saving</Button>
                    <Button variant="secondary" loading>Processing</Button>
                    <Button variant="destructive" loading>Deleting</Button>
                  </div>
                </PreviewCard>
              </div>

              {/* Skeletons */}
              <div>
                <SubsectionHeader title="Skeleton Loaders" description="Placeholder shapes for content loading" />
                <div className="grid grid-cols-2 gap-4">
                  <PreviewCard>
                    <LabelText className="mb-3">Text Placeholders</LabelText>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </PreviewCard>
                  <PreviewCard>
                    <LabelText className="mb-3">Card Placeholder</LabelText>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </PreviewCard>
                </div>
              </div>
            </div>
          </Section>

          {/* Empty States */}
          <Section id="empty-states">
            <SectionHeader
              title="Empty States"
              description="Consistent messaging for empty data and no results"
            />

            <div className="space-y-8">
              {/* Sizes */}
              <div>
                <SubsectionHeader title="Size Variants" />
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { size: 'compact' as const, label: 'compact' },
                    { size: 'default' as const, label: 'default' },
                    { size: 'lg' as const, label: 'lg' },
                  ].map((item) => (
                    <div key={item.size} className="border border-border rounded-xl overflow-hidden">
                      <div className="p-2 bg-background-subtle text-xs text-muted-foreground text-center border-b border-border">
                        {item.label}
                      </div>
                      <EmptyState
                        icon={ScrollIcon}
                        title="No items"
                        description="Items will appear here"
                        size={item.size}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Variant */}
              <div>
                <SubsectionHeader title="Card Variant" />
                <EmptyState
                  icon={CheckmarkCircle01Icon}
                  title="All caught up!"
                  description="No pending items to review"
                  size="lg"
                  variant="card"
                />
              </div>

              {/* With Action */}
              <div>
                <SubsectionHeader title="With Action Button" />
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
            </div>
          </Section>

          {/* Toasts & Alerts */}
          <Section id="toasts">
            <SectionHeader
              title="Toast & Alerts"
              description="Feedback messages for user actions"
            />

            <div className="space-y-8">
              {/* Toast */}
              <div>
                <SubsectionHeader title="Toast Notifications" description="Global messages that auto-dismiss" />
                <PreviewCard>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="success" size="sm" onClick={() => showNotification('success', 'Changes saved!')}>
                      Success
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => showNotification('error', 'Something went wrong')}>
                      Error
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => showNotification('warning', 'Session expiring soon')}>
                      Warning
                    </Button>
                    <Button variant="accent" size="sm" onClick={() => showNotification('info', 'New features available')}>
                      Info
                    </Button>
                  </div>
                </PreviewCard>
              </div>

              {/* Inline Alerts */}
              <div>
                <SubsectionHeader title="Inline Alerts" description="Persistent messages within the page" />
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
                    <AlertDescription>Tip: Drag items to reorder your priority list.</AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Usage */}
              <PreviewCard className="bg-background">
                <LabelText className="mb-4">Usage</LabelText>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">Toast (temporary):</p>
                    <code className="text-accent text-xs">{"showNotification('success', 'Saved!')"}</code>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Alert (persistent):</p>
                    <code className="text-accent text-xs">{'<Alert variant="success">Message</Alert>'}</code>
                  </div>
                </div>
              </PreviewCard>
            </div>
          </Section>

          {/* ============================================== */}
          {/* PATTERNS */}
          {/* ============================================== */}

          {/* Navigation */}
          <Section id="navigation">
            <SectionHeader
              title="Navigation"
              description="Active state uses orange accent with subtle background"
            />

            <PreviewCard className="max-w-xs">
              <div className="bg-background-subtle p-4 rounded-lg space-y-2">
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
              </div>
            </PreviewCard>
          </Section>

          {/* Selector Cards */}
          <Section id="selector-cards">
            <SectionHeader
              title="Selector Cards"
              description="Guild and character selector pattern from Figma"
            />

            <PreviewCard className="max-w-xs">
              <div className="bg-background-subtle p-4 rounded-lg space-y-3">
                <div>
                  <p className="section-label px-3 mb-1">Current Guild</p>
                  <div className="card-gradient flex items-center gap-3 px-3.5 py-2 cursor-pointer hover:border-border-strong transition-colors">
                    <div className="w-5 h-5 rounded bg-foreground-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground truncate">Big Yikes</p>
                      <p className="text-xs text-foreground-secondary">Pagle - Alliance</p>
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
            </PreviewCard>
          </Section>

          {/* WoW Class Colors */}
          <Section id="wow-classes">
            <SectionHeader
              title="WoW Class Colors"
              description="Character name colors by class"
            />

            <PreviewCard>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { name: 'Warrior', class: 'warrior' },
                  { name: 'Paladin', class: 'paladin' },
                  { name: 'Hunter', class: 'hunter' },
                  { name: 'Rogue', class: 'rogue' },
                  { name: 'Priest', class: 'priest' },
                  { name: 'Death Knight', class: 'deathknight' },
                  { name: 'Shaman', class: 'shaman' },
                  { name: 'Mage', class: 'mage' },
                  { name: 'Warlock', class: 'warlock' },
                  { name: 'Druid', class: 'druid' },
                ].map((item) => (
                  <div key={item.class} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full bg-class-${item.class} ${item.class === 'priest' ? 'border border-border' : ''}`} />
                    <span className={`text-class-${item.class} text-sm`}>{item.name}</span>
                  </div>
                ))}
              </div>
            </PreviewCard>
          </Section>

          {/* Footer */}
          <footer className="pt-8 border-t border-border">
            <p className="text-muted-foreground text-sm">
              LootList+ Design System - Poppins font - HugeIcons (Standard Stroke) - Dark-first with light mode
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
