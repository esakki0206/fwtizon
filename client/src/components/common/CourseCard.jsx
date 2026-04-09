import { Link } from 'react-router-dom';
import { FiStar, FiClock, FiBookOpen, FiPlayCircle, FiCheckCircle, FiUsers } from 'react-icons/fi';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';

const CourseCard = ({ course, enrollment, index = 0 }) => {
  const isEnrolled = !!enrollment;
  const data = isEnrolled ? enrollment.course : course;
  const percentComplete = isEnrolled ? (enrollment.progress?.percentComplete || 0) : 0;

  if (!data) return null;

  // Calculate total duration if modules exist
  const totalMinutes = data.modules?.reduce((acc, mod) =>
    acc + (mod.lessons?.reduce((a, l) => a + Math.floor((l.duration || 600) / 60), 0) || 0), 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="h-full"
    >
      <Card className="overflow-hidden group h-full flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">

        <div className="relative overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <img
            src={data.thumbnail && data.thumbnail !== 'no-photo.jpg' ? data.thumbnail : '/default-course.jpg'}
            alt={data.title}
            className="object-cover w-full h-full relative z-0 transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-2.5 left-2.5 z-20">
            <span className="px-2.5 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm rounded-lg text-[9px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">
              {data.category || "General"}
            </span>
          </div>

          {isEnrolled && (
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button asChild className="rounded-xl shadow-xl shadow-primary-500/30 text-xs">
                <Link to={`/learn/${data.slug || data._id}`}>
                  <FiPlayCircle className="mr-1.5 h-4 w-4" /> Resume
                </Link>
              </Button>
            </div>
          )}
        </div>

        <CardHeader className="pb-2 px-4 pt-4">
          {!isEnrolled && (
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1 text-yellow-500">
                <FiStar className="fill-current" size={12} />
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {data.ratings ? data.ratings.toFixed(1) : 'N/A'}
                </span>
                <span className="text-[10px] text-gray-500 font-medium ml-0.5">
                  ({data.numReviews || 0})
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[10px] text-gray-500 font-medium">
                {totalMinutes > 0 && (
                  <span className="flex items-center"><FiClock className="mr-0.5" size={10} />{totalMinutes}m</span>
                )}
                <span className="flex items-center"><FiUsers className="mr-0.5" size={10} />{data.enrollmentCount || 0}</span>
              </div>
            </div>
          )}

          <Link to={isEnrolled ? `/learn/${data.slug || data._id}` : `/courses/${data.slug || data._id}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            <CardTitle className="text-sm md:text-base line-clamp-2 leading-snug font-bold text-gray-900 dark:text-white">
              {data.title}
            </CardTitle>
          </Link>

          <div className="mt-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {data.instructor?.name || 'Fwtion Academy'}
          </div>
        </CardHeader>

        <CardContent className="flex-grow px-4 pb-3">
          {!isEnrolled ? (
            <CardDescription className="line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              {data.description}
            </CardDescription>
          ) : (
            <div className="mt-1 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className={percentComplete === 100 ? "text-green-600" : "text-primary-600 dark:text-primary-400"}>
                  {percentComplete === 100 ? "Completed" : "In Progress"}
                </span>
                <span className="text-gray-600 dark:text-gray-300">{percentComplete}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentComplete}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${percentComplete === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 pb-4 px-4 border-t border-gray-50 dark:border-gray-800/50 flex flex-col space-y-3 bg-gray-50/30 dark:bg-gray-900/30">
          {!isEnrolled ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xl font-bold text-gray-900 dark:text-white flex items-end">
                ₹{data.price || '0'}
              </span>
              <Button asChild size="sm" className="font-semibold rounded-xl px-5 shadow-sm shadow-primary-500/15 text-xs">
                <Link to={`/courses/${data.slug || data._id}`}>Enroll Now</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-[10px] font-medium text-gray-500 dark:text-gray-400">
              <span className="flex items-center"><FiCheckCircle className="mr-1 text-green-500" size={12} /> {enrollment.progress?.completedLessons?.length || 0} Lessons Done</span>
              <span className="flex items-center"><FiClock className="mr-1" size={12} /> Last accessed today</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default CourseCard;
