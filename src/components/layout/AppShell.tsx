'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Drawer,
  IconButton,
  Button,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '@/context/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, isAdmin, signOut } = useAuth();

  // If on login page, render full screen without the sidebar shell
  if (pathname === '/login') {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  const navItems = [
    {
      label: 'Chat Assistant',
      href: '/chat',
      icon: <ChatIcon fontSize="small" />,
      badge: 'Active',
      description: 'Conversational financial analysis',
    },
    ...(isAdmin
      ? [
          {
            label: 'Operations Dashboard',
            href: '/dashboard',
            icon: <DashboardIcon fontSize="small" />,
            badge: 'Admin',
            badgeColor: 'bg-blue-100 text-[#1a56db]',
            description: 'Full ingestion & delete control',
          },
        ]
      : []),
  ];

  const recentChats = [
    {
      title: 'Alpha Corp 10-K FY2025',
      date: '2h ago',
      category: '10-K Filing',
      icon: <DescriptionIcon className="text-blue-600 text-sm" />,
    },
    {
      title: 'Q3 Cash Flow & EBITDA Shift',
      date: 'Yesterday',
      category: '10-Q Report',
      icon: <TrendingUpIcon className="text-emerald-600 text-sm" />,
    },
    {
      title: 'Vendor Invoice INV-9812 Audit',
      date: '2 days ago',
      category: 'Invoice',
      icon: <FactCheckIcon className="text-purple-600 text-sm" />,
    },
    {
      title: '2024 vs 2025 Balance Sheet',
      date: 'Oct 21',
      category: 'Balance Sheet',
      icon: <AccountBalanceIcon className="text-amber-600 text-sm" />,
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#f9fafb] text-slate-800 border-r border-slate-200/90 select-none">
      {/* Top Branding & Workspace */}
      <div className="p-4 border-b border-slate-200/80 bg-white">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-9 h-9 rounded-xl bg-[#1a56db] text-white flex items-center justify-center shadow-xs">
              <AccountBalanceIcon fontSize="small" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  FinAgent AI
                </span>
                <span className="text-[10px] font-semibold bg-blue-50 text-[#1a56db] border border-blue-200/80 px-1.5 py-0.2 rounded">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Financial Intelligence</p>
            </div>
          </Link>
          <div className="lg:hidden">
            <IconButton size="small" onClick={() => setMobileOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </div>

        {/* Start New Chat Button */}
        <Link href="/chat" className="no-underline block mt-4" onClick={() => setMobileOpen(false)}>
          <button className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-xs shadow-xs hover:border-[#1a56db] hover:text-[#1a56db] hover:bg-blue-50/40 active:scale-[0.99] transition-all cursor-pointer">
            <AddIcon fontSize="small" className="text-[#1a56db]" />
            <span>New Financial Query</span>
          </button>
        </Link>
      </div>

      {/* Navigation Links & Recent Conversations */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Links */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Platform Modules
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                isAdmin
                  ? 'bg-blue-50 text-[#1a56db] border border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {role} View
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium no-underline transition-all ${
                    isActive
                      ? 'bg-blue-50/90 text-[#1a56db] font-semibold border border-blue-200/70 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-[#1a56db]' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        item.badgeColor || (isActive ? 'bg-[#1a56db] text-white' : 'bg-slate-200 text-slate-600')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Recent Financial Sessions */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Recent Queries
            </span>
            <span className="text-[10px] text-slate-400 font-mono">4 sessions</span>
          </div>

          <div className="space-y-1">
            {recentChats.map((chat, idx) => (
              <Link
                key={idx}
                href="/chat"
                onClick={() => setMobileOpen(false)}
                className="group flex flex-col p-2.5 rounded-xl hover:bg-white hover:border-slate-200/90 border border-transparent transition-all no-underline text-slate-700"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    {chat.icon}
                    <span className="truncate font-medium text-slate-800 group-hover:text-[#1a56db] transition-colors">
                      {chat.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-1 font-mono">
                    {chat.date}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 ml-5">
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {chat.category}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Role Permissions Card */}
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-700">Access Scope</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isAdmin
                  ? 'bg-blue-50 text-[#1a56db] border border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {role}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug mb-2">
            {isAdmin
              ? 'Administrator access: Full privileges to ingest, vectorize, delete documents, and view audit metrics.'
              : 'Staff access: Conversational querying and GenUI charts active. Document deletion and pipeline configuration locked.'}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
            <CheckCircleIcon className="text-emerald-500 text-xs" />
            <span>Vector Index: 312 Chunks Ready</span>
          </div>
        </div>
      </div>

      {/* User Profile & Footer Section with Role Switcher */}
      <div className="p-3 border-t border-slate-200/80 bg-white space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="flex items-center gap-2.5 truncate">
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: user.avatarColor || '#1a56db',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {user.initials}
            </Avatar>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate leading-tight">
                {user.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Tooltip title="Sign Out of Supabase">
              <IconButton
                size="small"
                onClick={async () => {
                  await signOut();
                  router.push('/login');
                }}
                className="text-slate-400 hover:text-slate-800 p-1"
              >
                <LogoutIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* User Role Status (Immutable from frontend) */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px]">
          <span className="text-slate-500 font-medium">Role:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${
              isAdmin
                ? 'bg-blue-100 text-[#1a56db]'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {role}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white text-slate-900 antialiased">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            },
          },
        }}
        className="lg:hidden"
      >
        {sidebarContent}
      </Drawer>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header Bar with Hamburger */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <IconButton
              size="small"
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => setMobileOpen(true)}
              className="text-slate-700"
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1a56db] text-white flex items-center justify-center">
                <AccountBalanceIcon sx={{ fontSize: 16 }} />
              </div>
              <span className="font-bold text-sm text-slate-900">FinAgent</span>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                {role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/chat" className="no-underline">
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                className="text-xs border-slate-300 text-slate-700 rounded-lg py-1 px-2.5"
              >
                New Chat
              </Button>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
