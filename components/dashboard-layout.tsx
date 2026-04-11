'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import {
  Home,
  Briefcase,
  Users,
  Calendar,
  Settings,
  Sparkles,
  Menu,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  {
    title: 'Home',
    url: '/',
    icon: Home,
  },
  {
    title: 'Jobs',
    url: '/dashboard/jobs',
    icon: Briefcase,
  },
  {
    title: 'Candidates',
    url: '/dashboard/candidates',
    icon: Users,
  },
  {
    title: 'Schedules/Interview',
    url: '/dashboard/schedules',
    icon: Calendar,
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-gray-800 bg-gray-950">
          {/* Sidebar Header - App Name and Logo */}
          <SidebarHeader className="border-b border-gray-800 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">AI Recruiter</span>
                <span className="text-xs text-gray-400">Hiring Platform</span>
              </div>
            </div>
          </SidebarHeader>

          {/* Sidebar Content - Menu Items */}
          <SidebarContent className="px-3 py-4">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`group relative overflow-hidden transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border-l-2 border-blue-500'
                          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                      }`}
                    >
                      <Link href={item.url}>
                        <item.icon
                          className={`h-5 w-5 transition-colors ${
                            isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-white'
                          }`}
                        />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Sidebar Footer - Profile and Upgrade */}
          <SidebarFooter className="border-t border-gray-800 p-4 space-y-3">
            {/* Profile Section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <Avatar className="h-10 w-10 border-2 border-gray-700">
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                      {user?.firstName?.[0]}{user?.lastName?.[0] || user?.firstName?.[1] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.fullName || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.primaryEmailAddress?.emailAddress || 'Loading...'}
                    </p>
                  </div>
                  <Settings className="h-4 w-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-800">
                <DropdownMenuLabel className="text-gray-400">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem asChild className="text-gray-300 focus:text-white focus:bg-gray-800 cursor-pointer">
                  <Link href="/dashboard/profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-gray-300 focus:text-white focus:bg-gray-800 cursor-pointer">
                  <Link href="/dashboard/settings">Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem asChild className="text-red-400 focus:text-red-300 focus:bg-gray-800 cursor-pointer">
                  <Link href="/sign-out">Sign Out</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
          {/* Desktop Header */}
          <header className="hidden md:flex sticky top-0 z-40 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl px-6 py-4">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'h-10 w-10',
                  },
                }}
              />
            </div>
          </header>

          {/* Mobile Header */}
          <header className="md:hidden sticky top-0 z-40 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-white">AI Recruiter</span>
                </div>
              </div>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'h-8 w-8',
                  },
                }}
              />
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
