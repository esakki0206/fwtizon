import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FiSend, FiMail, FiGlobe } from 'react-icons/fi';

const Announcements = () => {
  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Broadcasting</h1>
        <p className="text-gray-500 mt-1">Push real-time alerts or emails to segments of the student population.</p>
      </div>

      <Card className="border-primary-200 dark:border-primary-900/30 shadow-lg shadow-primary-500/5">
        <CardHeader className="bg-primary-50 dark:bg-primary-950/20 border-b border-primary-100 dark:border-primary-900/50 pb-4">
          <CardTitle className="text-lg text-primary-700 dark:text-primary-400 flex items-center">
            <FiGlobe className="mr-2" /> Global Announcement Dispatch
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white block mb-1">Alert Headline</label>
            <input type="text" placeholder="e.g. Platform Scheduled Maintenance" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white block mb-1">Broadcast Message Body</label>
            <textarea placeholder="Write full details..." className="w-full h-40 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-shadow"></textarea>
          </div>
          <div className="flex items-center space-x-6 py-2">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center"><FiGlobe className="mr-1.5" /> Post to student dashboards</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center"><FiMail className="mr-1.5" /> Also blast via Email triggers</span>
            </label>
          </div>
          <Button size="lg" className="w-full font-bold shadow-md shadow-primary-500/20">
            <FiSend className="mr-2" /> Fire Broadcast
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Announcements;
