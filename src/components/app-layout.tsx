
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { BarChart3, Boxes, LayoutDashboard, LogOut, Settings, ShoppingCart, Users, ShieldCheck, FileText, Landmark } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/suppliers', icon: Landmark, label: 'Suppliers' },
  { href: '/inventory', icon: Boxes, label: 'Inventory' },
  { href: '/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/invoices', icon: FileText, label: 'Invoices' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/admin', icon: ShieldCheck, label: 'Admin' },
];

function Logo() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedLogo = localStorage.getItem('companyLogo');
        setLogoUrl(savedLogo);
    }, []);
    
    const renderDefaultLogo = () => (
        <>
            <Icons.logo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold">AB AGENCY</span>
        </>
    );

    if (!isMounted) {
        return renderDefaultLogo();
    }

    if (logoUrl) {
        return <img src={logoUrl} alt="Company Logo" className="h-16" data-ai-hint="logo" />;
    }

    return renderDefaultLogo();
}


function MainSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="justify-start w-full gap-2 p-2 h-auto">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/100x100.png" alt="@shadcn" />
                        <AvatarFallback>AA</AvatarFallback>
                    </Avatar>
                     <div className="text-left group-data-[collapsible=icon]:hidden">
                        <p className="font-medium text-sm">Admin User</p>
                        <p className="text-xs text-muted-foreground">admin@abagency1977@gmail.com</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4"/><span>Settings</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/"><LogOut className="mr-2 h-4 w-4"/><span>Log out</span></Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function MobileHeader() {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!isMobile) return null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
           <SidebarTrigger className="sm:hidden" />
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle><VisuallyHidden>Main Navigation</VisuallyHidden></SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
              <SidebarHeader className="p-4">
                  <Link href="/dashboard" className="flex items-center gap-2">
                     <Logo />
                  </Link>
              </SidebarHeader>
              <SidebarContent className="p-4">
                  <SidebarMenu>
                  {navItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                          <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                  ))}
                  </SidebarMenu>
              </SidebarContent>
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        <h1 className="font-semibold text-lg">{navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}</h1>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MainSidebar />
      <SidebarInset className="flex flex-col">
        <MobileHeader />
        <ScrollArea className="flex-1">
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
