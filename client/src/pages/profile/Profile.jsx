import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiMail, FiLock, FiCamera } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (e) => {
    e.preventDefault();
    // In a real app we'd call an API here
    toast.success('Profile updated successfully! (Mock)');
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Account Settings</h1>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
           
           <div className="p-8 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-8">
             <div className="relative group">
               <img 
                 src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&size=128`} 
                 alt="Profile" 
                 className="w-32 h-32 rounded-full border-4 border-gray-50 dark:border-gray-700 object-cover"
               />
               <button className="absolute bottom-0 right-0 p-3 rounded-full bg-primary-600 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                 <FiCamera size={20} />
               </button>
             </div>
             <div className="text-center md:text-left">
               <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
               <p className="text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'Student'} Account</p>
             </div>
           </div>

           <div className="p-8">
             <form onSubmit={handleUpdate} className="space-y-6 max-w-xl">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                     <FiUser />
                   </div>
                   <input
                     type="text"
                     disabled={!isEditing}
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="pl-10 w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 disabled:opacity-75 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                     <FiMail />
                   </div>
                   <input
                     type="email"
                     disabled={!isEditing}
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="pl-10 w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 disabled:opacity-75 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                   />
                 </div>
               </div>

              </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
