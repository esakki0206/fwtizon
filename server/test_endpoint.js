import axios from 'axios';

const run = async () => {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@fwtion.com',
            password: 'password123'
        });

        let cookies = loginRes.headers['set-cookie'];

        // Find a live course
        const liveRes = await axios.get('http://localhost:5000/api/live-courses');
        const cohort = liveRes.data.data[0];

        if (!cohort) {
            console.log('No live courses found - cannot test order.');
            return;
        }

        console.log(`Found cohort: ${cohort._id}, requesting order...`);

        const orderRes = await axios.post('http://localhost:5000/api/enroll/create-order', {
            liveCourseId: cohort._id
        }, {
            headers: {
                Cookie: cookies ? cookies.join('; ') : ''
            }
        });

        console.log('ORDER SUCCESS:', orderRes.data);

    } catch (err) {
        console.log('ERROR STATUS:', err.response?.status);
        console.log('ERROR:', err.response ? err.response.data : err.message);
    }
};

run();
