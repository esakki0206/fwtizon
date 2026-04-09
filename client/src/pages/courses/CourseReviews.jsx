import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CourseReviews = ({ courseId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`/api/courses/${courseId}/reviews`);
        setReviews(res.data.data);
      } catch (err) {
        console.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return toast.error('Please add a comment');
    setSubmitting(true);
    
    try {
      const res = await axios.post(`/api/courses/${courseId}/reviews`, { rating, comment });
      // The API populates user info differently on creation, so we optimistically inject a generic shape
      // or simply re-fetch. Re-fetching ensures sync:
      const fullRes = await axios.get(`/api/courses/${courseId}/reviews`);
      setReviews(fullRes.data.data);
      setComment('');
      setRating(5);
      toast.success('Review submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-10 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Leave a Review</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className={`transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-500 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
              >
                <FiStar size={28} className={rating >= star ? 'fill-current' : ''} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience taking this course..."
            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none dark:text-white"
            rows="3"
            required
          ></textarea>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Post Review'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
        ) : reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review._id} className="border-b border-gray-100 dark:border-gray-800 pb-6 last:border-0 last:pb-0">
              <div className="flex items-center gap-4 mb-3">
                <img 
                  src={review.user?.avatar || 'https://ui-avatars.com/api/?name=U&background=random'} 
                  alt={review.user?.name || 'User'} 
                  className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-200"
                />
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{review.user?.name || 'Anonymous Student'}</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-500 text-xs">
                      {[...Array(review.rating)].map((_, i) => <FiStar key={i} className="fill-current" />)}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 pl-14 text-sm leading-relaxed">{review.comment}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6">No reviews yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </div>
  );
};

export default CourseReviews;
