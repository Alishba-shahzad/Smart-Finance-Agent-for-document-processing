'use client';

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../context/AuthContext.jsx';
import { getRecentChats, deleteRecentChat } from '../../lib/chatHistory.js';

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, isAdmin, signOut } = useAuth();

  // All React Hooks MUST be called unconditionally at top of component
  const [recentChats, setRecentChats] = useState(() => getRecentChats());

  useEffect(() => {
    // Sync recent queries immediately on mount and on route change
    setRecentChats(getRecentChats());

    const handleUpdate = () => {
      setRecentChats(getRecentChats());
    };

    window.addEventListener('finagent_recent_chats_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('finagent_recent_chats_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [pathname]);

  // If on login or home landing page, render full screen without the sidebar shell
  if (pathname === '/login' || pathname === '/') {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  const navItems = [
    {
      label: 'Home Portal',
      href: '/',
      icon: <AccountBalanceIcon fontSize="small" />,
      description: 'Platform overview & portal',
    },
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

  const getCategoryIcon = (category = '') => {
    switch (category) {
      case '10-K Filing':
        return <DescriptionIcon className="text-blue-600 text-sm" />;
      case '10-Q Report':
        return <TrendingUpIcon className="text-emerald-600 text-sm" />;
      case 'Invoice':
        return <FactCheckIcon className="text-purple-600 text-sm" />;
      case 'Balance Sheet':
        return <AccountBalanceIcon className="text-amber-600 text-sm" />;
      case 'Loan Portfolio':
        return <AccountBalanceIcon className="text-sky-600 text-sm" />;
      default:
        return <DescriptionIcon className="text-blue-500 text-sm" />;
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#f9fafb] text-slate-800 border-r border-slate-200/90 select-none">
      {/* Top Branding & Workspace */}
      <div className="p-4 border-b border-slate-200/80 bg-white">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
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
        <Link to="/chat" className="no-underline block mt-4" onClick={() => setMobileOpen(false)}>
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
                  to={item.href}
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

        {/* Recent Financial Sessions (Dynamic) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Recent Queries
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {recentChats.length} {recentChats.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>

          <div className="space-y-1">
            {recentChats.length === 0 ? (
              <div className="px-3 py-3 text-center text-[11px] text-slate-400 bg-white/70 rounded-xl border border-dashed border-slate-200">
                No recent queries yet.
              </div>
            ) : (
              recentChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setMobileOpen(false);
                    navigate(`/chat?q=${encodeURIComponent(chat.prompt || chat.title)}&sid=${chat.id}&t=${Date.now()}`);
                  }}
                  className="group relative flex flex-col p-2.5 rounded-xl hover:bg-white hover:border-slate-200/90 border border-transparent transition-all no-underline text-slate-700 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      {getCategoryIcon(chat.category)}
                      <span className="truncate font-medium text-slate-800 group-hover:text-[#1a56db] transition-colors">
                        {chat.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono group-hover:hidden">
                        {chat.date}
                      </span>
                      <button
                        type="button"
                        title="Delete query"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteRecentChat(chat.id);
                        }}
                        className="hidden group-hover:flex items-center justify-center w-4 h-4 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 ml-5">
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      {chat.category}
                    </span>
                  </div>
                </div>
              ))
            )}
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
                  navigate('/login');
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
            <Link to="/chat" className="no-underline">
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
