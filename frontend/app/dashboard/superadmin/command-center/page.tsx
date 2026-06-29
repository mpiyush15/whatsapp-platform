import { FC } from 'react'
import { Target, TrendingUp, HeartPulse, ListTodo, Book, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'

const CommandCentrePage: FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 dark">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">ReplySys Command Center</h1>
        <p className="text-muted-foreground mt-1">Your personal cockpit for running ReplySys.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* Today's Stats */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} /> Today's Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Calls Planned</p><p className="font-bold text-2xl">15</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Calls Done</p><p className="font-bold text-2xl">7</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Follow-ups</p><p className="font-bold text-2xl">12</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Tasks Done</p><p className="font-bold text-2xl">5</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Demos Set</p><p className="font-bold text-2xl">2</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Demos Done</p><p className="font-bold text-2xl">1</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">New Leads</p><p className="font-bold text-2xl">8</p></div>
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo size={20} /> Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3"><Checkbox id="task1" /> <label htmlFor="task1" className="text-sm">Call Mumbai Clinic Leads</label></div>
            <div className="flex items-center gap-3"><Checkbox id="task2" /> <label htmlFor="task2" className="text-sm">Create Education Template</label></div>
            <div className="flex items-center gap-3"><Checkbox id="task3" checked /> <label htmlFor="task3" className="text-sm finished">Follow-up Lab Prospect</label></div>
            <div className="flex items-center gap-3"><Checkbox id="task4" /> <label htmlFor="task4" className="text-sm">Record 1 Reel</label></div> 
            <div className="flex items-center gap-3"><Checkbox id="task5" /> <label htmlFor="task5" className="text-sm">Submit WhatsApp Templates</label></div>
          </CardContent>
        </Card>
        
        {/* What Should I Do Today? */}
        <Card className="bg-primary/10 border-primary/40 ring-1 ring-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
               What Should I Do Today?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. Call <span className="font-bold">5 overdue leads.</span></p>
            <p>2. Follow-up <span className="font-bold">3 demo prospects.</span></p>
            <p>3. Record <span className="font-bold">1 healthcare reel.</span></p>
            <p>4. Submit <span className="font-bold">2 WhatsApp templates.</span></p>
            <p>5. Contact <span className="font-bold">10 coaching institutes.</span></p>
          </CardContent>
        </Card>

        {/* Monthly Projection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} /> Monthly Projection
            </CardTitle>
            <CardDescription>Forecast based on current pipeline and activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Target</p><p className="font-bold text-xl">₹50,000</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Current</p><p className="font-bold text-xl text-green-400">₹7,500</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Pipeline</p><p className="font-bold text-xl">₹45,000</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Forecast</p><p className="font-bold text-xl text-amber-400">₹22,000</p></div>
            <div className="flex flex-col gap-1"><p className="text-muted-foreground">Gap to Goal</p><p className="font-bold text-xl text-red-400">₹42,500</p></div>
          </CardContent>
        </Card>

        {/* Business Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse size={20} /> Business Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span>Sales Activity</span> <span className="font-bold">8/10</span></div>
            <div className="flex justify-between items-center"><span>Follow-Ups</span> <span className="font-bold">6/10</span></div>
            <div className="flex justify-between items-center"><span>Content</span> <span className="font-bold">5/10</span></div>
            <div className="flex justify-between items-center"><span>Revenue</span> <span className="font-bold">3/10</span></div>
            <div className="flex justify-between items-center font-bold text-base pt-2 border-t border-border mt-2"><span>Overall</span> <span>5.5/10</span></div>
          </CardContent>
        </Card>
        
        {/* Sales Intelligence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb size={20} /> Sales Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>You contacted <span className="font-bold">12 leads</span> this week.</p>
            <p>Most responses are from <span className="font-bold">Coaching Institutes</span>.</p>
            <p>No follow-up for <span className="font-bold text-amber-400">8 interested leads</span>.</p>
            <p className="font-bold text-primary pt-2">Recommendation: Call interested leads before adding new prospects.</p>
          </CardContent>
        </Card>
        
        {/* Founder Journal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book size={20} /> Founder Journal
            </CardTitle>
            <CardDescription>Log your daily wins. We'll summarize them for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea className="w-full bg-background" rows={5} placeholder="Today I..." />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default CommandCentrePage
