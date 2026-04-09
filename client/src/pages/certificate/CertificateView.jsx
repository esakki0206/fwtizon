import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { FiDownload } from 'react-icons/fi';

const CertificateView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const certRef = useRef();
  
  // Real app fetches specific certificate details based on ID
  // Mock data for display purposes
  const certData = {
    courseName: "Complete React & NodeJS Fullstack Engineering",
    issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    instructor: "Admin Instructor",
    certId: id
  };

  const handleDownload = async () => {
    const element = certRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const data = canvas.toDataURL('image/png');
    
    let link = document.createElement('a');
    link.href = data;
    link.download = `Certificate_${id}.png`;
    link.click();
  };

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
          ref={certRef}
          className="w-full h-full border-[16px] border-primary-900 p-12 flex flex-col relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5"
        >
          {/* Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-[15rem] font-black text-gray-900">FWTION</span>
          </div>

          <div className="flex justify-between items-start mb-16 relative z-10">
            <div className="text-4xl font-black bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">Fwtion</div>
            <div className="text-right">
              <p className="text-gray-500 font-medium">Certificate ID</p>
              <p className="font-mono text-gray-800">{certData.certId}</p>
            </div>
          </div>

          <div className="text-center flex-grow flex flex-col justify-center relative z-10">
            <p className="text-gray-500 tracking-[0.2em] font-semibold mb-2 uppercase">Certificate of Completion</p>
            <h2 className="text-2xl text-gray-800 mb-8">This is proudly presented to</h2>
            
            <h1 className="text-6xl font-serif italic text-primary-900 border-b-2 border-primary-200 inline-block mx-auto pb-4 mb-8 px-12">
              {user?.name || "Student Name"}
            </h1>
            
            <p className="text-gray-600 max-w-2xl mx-auto mb-2 text-lg">
              for successfully completing the comprehensive coursework and passing all assessments in
            </p>
            <h3 className="text-2xl font-bold text-gray-900">{certData.courseName}</h3>
          </div>

          <div className="flex justify-between items-end mt-16 relative z-10">
            <div className="text-center w-48">
              <div className="border-b-2 border-gray-400 mb-2 pb-2">
                <span className="font-medium text-gray-900">{certData.issueDate}</span>
              </div>
              <p className="text-sm text-gray-500 uppercase">Date of Issue</p>
            </div>
            
            <div className="w-32 h-32 relative">
               {/* Mock Gold Seal */}
               <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                 <div className="w-28 h-28 border border-white/50 rounded-full flex flex-col items-center justify-center text-white text-center p-2">
                   <div className="font-serif text-2xl mb-1 mt-1">★</div>
                   <span className="text-[10px] uppercase font-bold tracking-widest leading-tight">Verified<br/>Fwtion<br/>LMS</span>
                 </div>
               </div>
            </div>

            <div className="text-center w-48">
              <div className="border-b-2 border-gray-400 mb-2 font-serif italic pb-2 text-xl text-gray-800">
                {certData.instructor}
              </div>
              <p className="text-sm text-gray-500 uppercase">Lead Instructor</p>
            </div>
          </div>

        </div>
      </motion.div>

      <div className="mt-8 flex space-x-4">
        <button 
          onClick={handleDownload}
          className="px-8 py-4 bg-primary-600 text-white rounded-full font-bold shadow-lg hover:bg-primary-700 transition flex items-center"
        >
          <FiDownload className="mr-2" size={20} /> Download PDF / PNG
        </button>
      </div>

    </div>
  );
};

export default CertificateView;
