import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAward, FiFileText, FiDownload, FiCheckCircle, FiExternalLink } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
    <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6" />
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
  </div>
);

const MyCertificates = () => {
  const [activeTab, setActiveTab] = useState('certificates');
  const [certificates, setCertificates] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    if(user) fetchData();
  }, [activeTab, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'certificates') {
        const res = await axios.get(`/api/certificates/user/${user._id}`);
        if (res.data.success) {
          setCertificates(res.data.data);
        }
      } else {
        const res = await axios.get('/api/receipts/my');
        if (res.data.success) {
          setReceipts(res.data.data);
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <FiAward className="mr-3 text-primary-600" />
          My Certificates & Receipts
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          View and download your official course certificates and payment receipts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
            activeTab === 'certificates'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center">
            <FiAward className="mr-2" /> Certificates
          </span>
          {activeTab === 'certificates' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
            activeTab === 'receipts'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center">
            <FiFileText className="mr-2" /> Receipts
          </span>
          {activeTab === 'receipts' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'certificates' ? (
              <motion.div
                key="certs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {certificates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <FiAward className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No certificates yet</h3>
                    <p className="text-gray-500 max-w-sm mb-6">
                      Complete your enrolled courses by finishing all lessons to earn your official certificates.
                    </p>
                    <Link to="/dashboard/courses" className="text-primary-600 font-semibold hover:underline">
                      Go to My Courses &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map((cert) => (
                      <div key={cert._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden">
                          <img 
                            src={cert.course?.thumbnail || cert.liveCourse?.thumbnail || '/default-course.jpg'} 
                            alt={cert.courseName}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                          <div className="absolute top-3 right-3 text-white">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm ${cert.type === 'COHORT' ? 'bg-purple-600' : 'bg-primary-600'}`}>
                              {cert.type === 'COHORT' ? 'Cohort Certificate' : 'Course Certificate'}
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-3 text-white">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-1 rounded-md">
                              {cert.certificateId}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-grow text-left">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{cert.courseName}</h3>
                          <p className="text-xs text-gray-500 mb-4 flex-grow">
                            Issued on {new Date(cert.issueDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-auto">
                            <button 
                              onClick={() => handleDownload(cert.fileUrl)}
                              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center transition-colors"
                            >
                              <FiDownload className="mr-2" /> Download PDF
                            </button>
                            <Link 
                              to={`/certificate/${cert.certificateId}`} 
                              className="p-2 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                              title="Public View"
                            >
                              <FiExternalLink />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="receipts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {receipts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <FiFileText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No receipts found</h3>
                    <p className="text-gray-500 max-w-sm mb-6">
                      You haven't made any purchases yet. Your payment receipts will securely appear here.
                    </p>
                    <Link to="/courses" className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition-colors">
                      Explore Courses
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {receipts.map((receipt) => (
                      <div key={receipt._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-start hover:shadow-md transition-shadow justify-between h-full">
                        <div className="w-full text-left">
                          <div className="flex items-start justify-between mb-4 w-full">
                            <div className="flex items-center text-green-500 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-full text-xs font-bold">
                              <FiCheckCircle className="mr-1" /> SUCCESS
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(receipt.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{receipt.courseName}</h3>
                          <div className="text-sm border-t border-gray-100 dark:border-gray-700 pt-3 mt-3 w-full space-y-1">
                            <p className="flex justify-between">
                              <span className="text-gray-500">Amount</span>
                              <span className="font-bold text-gray-900 dark:text-white">₹{receipt.amount}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-gray-500">Receipt No</span>
                              <span className="font-mono text-gray-900 dark:text-white text-xs">{receipt.receiptId}</span>
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDownload(receipt.fileUrl)}
                          className="mt-5 w-full border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center transition-colors"
                        >
                          <FiDownload className="mr-2" /> Download Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default MyCertificates;
