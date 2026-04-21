import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiDownload } from 'react-icons/fi';
import axios from 'axios';

const CertificateView = () => {
  const { id } = useParams();
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await axios.get(`/api/certificates/${id}`);
        setCertData(res.data.data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [id]);

  const handleDownload = () => {
    if (certData?.fileUrl) {
      window.open(certData.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading certificate...</div>;
  if (error || !certData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Certificate not found.</div>;

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 flex flex-col items-center justify-center">
      
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Your Certificate of Completion</h1>
        <p className="text-gray-400">Share this certificate with your network to showcase your newly acquired skills!</p>
      </div>

      {/* Certificate Render Frame */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[900px] aspect-[1.414/1] bg-white relative p-2 shadow-2xl rounded"
      >
        <div 
          className="w-full h-full border-[16px] border-[#1a1a2e] p-12 flex flex-col relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5"
        >
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-[15rem] font-black text-gray-900">FWTION</span>
          </div>

          <div className="flex justify-between items-start mb-16 relative z-10">
            <div className="text-4xl font-black text-[#1a1a2e]">FWT <span className="text-[#c9a84c]">iZON</span></div>
            <div className="text-right">
              <p className="text-gray-500 font-medium">Certificate ID</p>
              <p className="font-mono text-gray-800">{certData.certificateId}</p>
            </div>
          </div>

          <div className="text-center flex-grow flex flex-col justify-center relative z-10">
            <p className="text-[#1a1a2e] tracking-[0.2em] font-bold text-3xl mb-8 uppercase" style={{ fontFamily: 'Georgia, serif' }}>
              Certificate of Completion
            </p>
            <h2 className="text-xl text-gray-600 mb-6">This is proudly presented to</h2>
            
            <h1 className="text-5xl font-serif text-[#1a1a2e] border-b border-gray-300 inline-block mx-auto pb-2 mb-8 px-12">
              {certData.studentName}
            </h1>
            
            <p className="text-gray-600 max-w-2xl mx-auto mb-2 text-md">
              for successfully completing the training program in
            </p>
            <h3 className="text-2xl font-bold text-[#1a1a2e]">{certData.courseName}</h3>
          </div>

          <div className="flex justify-between items-end mt-16 relative z-10">
            <div className="text-center w-48">
              <div className="border-b border-[#1a1a2e] mb-2 pb-2">
                <span className="font-bold text-[#1a1a2e]">{new Date(certData.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <p className="text-sm text-gray-500 uppercase font-medium">Date of Issue</p>
            </div>
            
            <div className="w-32 h-32 relative">
               {/* Gold Seal */}
               <div className="absolute inset-0 bg-[#c9a84c] rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                 <div className="w-28 h-28 border-2 border-white/50 rounded-full flex flex-col items-center justify-center text-white text-center p-2">
                   <div className="font-serif text-2xl mb-1 mt-1">★</div>
                   <span className="text-[10px] uppercase font-bold tracking-widest leading-tight">Verified<br/>FWT<br/>iZON</span>
                 </div>
               </div>
            </div>

            <div className="text-center w-48">
              <div className="border-b border-[#1a1a2e] mb-2 pb-2 text-xl text-[#1a1a2e] font-bold">
                Ajay James
              </div>
              <p className="text-sm text-gray-500 uppercase font-medium">Director</p>
            </div>
          </div>
        </div>
      </motion.div>

      <button 
        onClick={handleDownload}
        className="mt-8 flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg transition-colors font-semibold"
      >
        <FiDownload className="mr-2" /> Download Official PDF
      </button>
    </div>
  );
};

export default CertificateView;
