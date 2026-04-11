'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  MessageSquare, 
  Settings2, 
  Zap, 
  Save, 
  RefreshCcw,
  Sparkles,
  Volume2,
  Brain,
  Mail,
  Loader2,
  Info,
  Building2
} from "lucide-react";
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Settings {
  agentName: string;
  systemPrompt: string;
  questionCount: number;
  voiceId: string;
  autoInvite: boolean;
  companyName: string;
  companyDescription: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    agentName: 'AI Recruiter',
    systemPrompt: '',
    questionCount: 8,
    voiceId: 'alloy',
    autoInvite: true,
    companyName: 'AI Recruitment Platform',
    companyDescription: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings updated successfully');
      } else {
        toast.error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('An error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Settings2 className="h-8 w-8 text-blue-500" />
              Agent Configuration
            </h1>
            <p className="text-gray-400">Customize how your AI recruiter interacts with candidates</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/20 px-8 h-12 rounded-xl transition-all active:scale-95"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="persona" className="space-y-6">
          <TabsList className="bg-gray-800/50 p-1 border border-gray-700/50 h-auto gap-1">
            <TabsTrigger value="persona" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-2.5 rounded-lg transition-all">
              <Bot className="h-4 w-4 mr-2" />
              Agent Persona
            </TabsTrigger>
            <TabsTrigger value="interview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-2.5 rounded-lg transition-all">
              <MessageSquare className="h-4 w-4 mr-2" />
              Interview Logic
            </TabsTrigger>
            <TabsTrigger value="workflow" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-2.5 rounded-lg transition-all">
              <Zap className="h-4 w-4 mr-2" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="company" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-2.5 rounded-lg transition-all">
              <Building2 className="h-4 w-4 mr-2" />
              Company Info
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PERSONA */}
          <TabsContent value="persona" className="space-y-6">
            <Card className="bg-gray-800/20 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  AI Identity
                </CardTitle>
                <CardDescription className="text-gray-400">Settings for the agent's name and core personality</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="agentName" className="text-gray-200">Agent Display Name</Label>
                    <Input 
                      id="agentName" 
                      value={settings.agentName}
                      onChange={(e) => setSettings({ ...settings, agentName: e.target.value })}
                      className="bg-gray-901 border-gray-700 text-white h-11 focus:ring-blue-500 rounded-xl"
                      placeholder="e.g. Maya, AI Recruiter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voiceId" className="text-gray-200">Voice Identity</Label>
                    <div className="flex gap-2">
                       <Input 
                        id="voiceId" 
                        value={settings.voiceId}
                        onChange={(e) => setSettings({ ...settings, voiceId: e.target.value })}
                        className="bg-gray-901 border-gray-700 text-white h-11 focus:ring-blue-500 rounded-xl"
                        placeholder="alloy, shimmer, echo"
                      />
                      <Button variant="outline" className="h-11 border-gray-700 bg-gray-800 text-gray-400 hover:text-white">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-700/50">
                   <div className="flex items-center justify-between">
                    <Label htmlFor="prompt" className="text-gray-200 flex items-center gap-2 font-semibold">
                      Master System Prompt
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-gray-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 border-gray-800 text-xs max-w-xs text-gray-300">
                             Use variables like [COUNT], [TITLE], and [DESCRIPTION] to dynamically insert job info.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <button 
                      onClick={() => fetchSettings()} 
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      Restore Default
                    </button>
                   </div>
                  <Textarea 
                    id="prompt" 
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                    className="min-h-[300px] bg-gray-901 border-gray-700 text-white focus:ring-blue-500 rounded-xl font-mono text-sm leading-relaxed p-6"
                    placeholder="Enter the AI behavior instructions..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: INTERVIEW LOGIC */}
          <TabsContent value="interview" className="space-y-6">
            <Card className="bg-gray-800/20 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  Interview Flow
                </CardTitle>
                <CardDescription className="text-gray-400">Configure how many questions are asked and how they are structured</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-200 text-base">Questions per Session</Label>
                      <p className="text-xs text-gray-500">The total number of AI questions generated for each interview</p>
                    </div>
                    <span className="text-2xl font-black text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">
                      {settings.questionCount}
                    </span>
                  </div>
                  <Slider 
                    value={[settings.questionCount]}
                    onValueChange={(val) => setSettings({ ...settings, questionCount: val[0] })}
                    max={20}
                    min={3}
                    step={1}
                    className="py-4 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                       <MessageSquare className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Generation Complexity</p>
                      <p className="text-xs text-gray-500">High Resolution Llama 3.3</p>
                    </div>
                  </div>
                   <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                       <Brain className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Assessment Quality</p>
                      <p className="text-xs text-gray-500">Detailed qualitative analysis</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: WORKFLOW */}
          <TabsContent value="workflow" className="space-y-6">
            <Card className="bg-gray-800/20 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-400" />
                  Workflow Automation
                </CardTitle>
                <CardDescription className="text-gray-400">Reduce manual work by automating recruiter tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                       <Mail className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white">Auto-Invite Candidates</p>
                      <p className="text-xs text-gray-500">Instantly send interview emails when a new candidate is added</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.autoInvite}
                    onCheckedChange={(val) => setSettings({ ...settings, autoInvite: val })}
                    className="data-[state=checked]:bg-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-2xl border border-gray-800 opacity-50 grayscale select-none">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                       <Brain className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white">Smart Status Pipeline</p>
                      <p className="text-xs text-gray-500">Auto-update candidate stages based on AI recommendations</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">COMING SOON</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* TAB 4: COMPANY INFO */}
          <TabsContent value="company" className="space-y-6">
            <Card className="bg-gray-800/20 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  Company Profile
                </CardTitle>
                <CardDescription className="text-gray-400">Define your company identity for the AI to represent your brand</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-gray-200">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="bg-gray-901 border-gray-700 text-white h-11 focus:ring-blue-500 rounded-xl"
                    placeholder="e.g. Acme Inc"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyDescription" className="text-gray-200">Company Background & Vision</Label>
                  <Textarea 
                    id="companyDescription" 
                    value={settings.companyDescription}
                    onChange={(e) => setSettings({ ...settings, companyDescription: e.target.value })}
                    className="min-h-[200px] bg-gray-901 border-gray-700 text-white focus:ring-blue-500 rounded-xl leading-relaxed"
                    placeholder="Describe your company's mission, culture, and values..."
                  />
                  <p className="text-xs text-gray-500 italic">
                    This information is shared with the AI to help it answer candidate questions about the company.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
