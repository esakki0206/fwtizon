import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiBookOpen } from 'react-icons/fi';
import CourseCard from '../../components/common/CourseCard';
import axios from 'axios';
import toast from 'react-hot-toast';

const CourseCatalog = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [searchParams] = useSearchParams();
  const fetchAbortControllerRef = useRef(null);

  // Read URL params on mount
  useEffect(() => {
    const urlKeyword = searchParams.get('keyword') || '';
    const urlCategory = searchParams.get('category') || '';
    if (urlKeyword) setSearchTerm(urlKeyword);
    if (urlCategory) setCategory(urlCategory);
  }, [searchParams]);

  useEffect(() => {
    // Cancel previous request if one is in progress
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    const fetchCourses = async () => {
      // Create new abort controller for this request
      const abortController = new AbortController();
      fetchAbortControllerRef.current = abortController;

      setLoading(true);
      try {
        let url = '/api/courses';
        const params = new URLSearchParams();
        if (searchTerm) params.append('keyword', searchTerm);
        if (category) params.append('category', category);

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await axios.get(url, { signal: abortController.signal });
        setCourses(res.data.data);
      } catch (err) {
        // Don't show error if request was aborted
        if (err.name !== 'CanceledError') {
          toast.error('Failed to fetch courses');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();

    // Cleanup: abort request on unmount
    return () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [searchTerm, category]);

  const categories = ['All', 'Development', 'Business', 'IT & Software', 'Design', 'Marketing', 'Personal Development'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header & Search */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Explore Courses</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">Top-rated courses taught by industry experts to level up your skills.</p>
          </div>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all shadow-sm"
            />
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>

        {/* Filters & Grid */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Filter */}
          <div className="w-full md:w-56 shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-20">
              <h3 className="font-bold flex items-center text-gray-900 dark:text-white mb-3 text-sm">
                <FiFilter className="mr-2" size={14} /> Categories
              </h3>
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => setCategory(cat === 'All' ? '' : cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                        (category === cat || (cat === 'All' && category === ''))
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grow">
            {/* Results count */}
            {!loading && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">
                  {courses.length} course{courses.length !== 1 ? 's' : ''} found
                  {category && <span className="text-primary-600 dark:text-primary-400"> in {category}</span>}
                </p>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-90 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 animate-shimmer"></div>
                ))}
              </div>
            ) : courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((course, i) => (
                  <CourseCard key={course._id} course={course} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <FiBookOpen size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No courses found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalog;
