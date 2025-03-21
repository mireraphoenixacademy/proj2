// script.js

// Utility function to fetch data with timeout and retry logic
async function fetchData(endpoint, retries = 1) {
    // Ensure the endpoint uses a relative path, which works on Vercel
    const baseUrl = ''; // Vercel serves API and frontend from the same domain, so no base URL is needed
    const fullUrl = `${baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

            const response = await fetch(fullUrl, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${fullUrl}:`, error.message);
            if (attempt === retries + 1) {
                console.error(`All attempts failed for ${fullUrl}. Returning default value.`);
                // Return default values based on the endpoint
                if (endpoint.includes('/api/learners') || endpoint.includes('/api/fees') || 
                    endpoint.includes('/api/books') || endpoint.includes('/api/classBooks') || 
                    endpoint.includes('/api/learnerArchives')) {
                    return []; // Default for arrays
                } else if (endpoint.includes('/api/feeStructure')) {
                    return {}; // Default for fee structure
                } else if (endpoint.includes('/api/termSettings')) {
                    return { currentTerm: 'Term 1', currentYear: new Date().getFullYear() }; // Default for term settings
                }
                throw error; // If no default value is defined, rethrow the error
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        }
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const [learners, fees, books, classBooks, feeStructure, termSettings, archivedYears] = await Promise.all([
            fetchData('/api/learners'),
            fetchData('/api/fees'),
            fetchData('/api/books'),
            fetchData('/api/classBooks'),
            fetchData('/api/feeStructure'),
            fetchData('/api/termSettings'),
            fetchData('/api/learnerArchives')
        ]);

        console.log('Fetched dashboard data:', { learners, fees, books, classBooks, feeStructure, termSettings, archivedYears });

        // Update UI with fetched data
        updateDashboard(learners, fees, books, classBooks, feeStructure, termSettings, archivedYears);
    } catch (error) {
        console.error('Failed to load dashboard data:', error.message);
        // Update the dashboard with default values
        updateDashboard([], [], [], [], {}, { currentTerm: 'Term 1', currentYear: new Date().getFullYear() }, []);
        alert('Unable to connect to the database. Displaying default values. Please try again later.');
    }
}

// Update dashboard UI
function updateDashboard(learners, fees, books, classBooks, feeStructure, termSettings, archivedYears) {
    // Update learner count
    document.getElementById('learnerCount').textContent = learners.length;

    // Update total fees paid
    const totalFeesPaid = fees.reduce((sum, fee) => sum + fee.amountPaid, 0);
    document.getElementById('totalFeesPaid').textContent = totalFeesPaid;

    // Update book count
    document.getElementById('bookCount').textContent = books.length;

    // Update class book count
    document.getElementById('classBookCount').textContent = classBooks.length;

    // Update term settings
    document.getElementById('currentTerm').textContent = termSettings.currentTerm;
    document.getElementById('currentYear').textContent = termSettings.currentYear;

    // Populate archived years dropdown (if applicable)
    const archiveSelect = document.getElementById('archiveYearSelect');
    if (archiveSelect) {
        archiveSelect.innerHTML = '<option value="">Select Year</option>';
        archivedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            archiveSelect.appendChild(option);
        });
    }
}

// Load learners page
async function loadLearners() {
    try {
        const learners = await fetchData('/api/learners');
        const tbody = document.querySelector('#learnersTable tbody');
        tbody.innerHTML = '';

        learners.forEach(learner => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${learner.fullName}</td>
                <td>${learner.gender}</td>
                <td>${learner.dob}</td>
                <td>${learner.grade}</td>
                <td>${learner.parentName}</td>
                <td>${learner.parentPhone}</td>
                <td>
                    <button onclick="editLearner('${learner._id}')">Edit</button>
                    <button onclick="deleteLearner('${learner._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to load learners:', error.message);
        alert('Failed to load learners. Please try again later.');
    }
}

// Generate the next admission number
async function getNextAdmissionNo() {
    try {
        const learners = await fetchData('/api/learners');
        const lastLearner = learners[learners.length - 1];
        const lastNumber = lastLearner ? parseInt(lastLearner.admissionNo.split('-')[1]) : 0;
        return `MPA-${String(lastNumber + 1).padStart(3, '0')}`;
    } catch (error) {
        console.error('Error generating admission number:', error.message);
        return 'MPA-001'; // Fallback
    }
}

// Add a new learner
async function addLearner(event) {
    event.preventDefault();
    const form = document.getElementById('learnerForm');
    const formData = new FormData(form);
    const learner = {
        admissionNo: await getNextAdmissionNo(),
        fullName: formData.get('fullName'),
        gender: formData.get('gender'),
        dob: formData.get('dob'),
        grade: formData.get('grade'),
        assessmentNumber: formData.get('assessmentNumber') || undefined,
        parentName: formData.get('parentName'),
        parentPhone: formData.get('parentPhone'),
        parentEmail: formData.get('parentEmail')
    };

    try {
        console.log('Adding learner:', learner);
        const response = await fetch('/api/learners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(learner)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Learner added successfully');
        form.reset();
        loadLearners();
    } catch (error) {
        console.error('Failed to add learner:', error.message);
        alert(`Failed to add learner: ${error.message}. Please try again.`);
    }
}

// Edit a learner
async function editLearner(id) {
    try {
        const learner = await fetchData(`/api/learners?id=${id}`);
        // Populate form with learner data
        document.getElementById('learnerId').value = learner._id;
        document.getElementById('fullName').value = learner.fullName;
        document.getElementById('gender').value = learner.gender;
        document.getElementById('dob').value = learner.dob;
        document.getElementById('grade').value = learner.grade;
        document.getElementById('assessmentNumber').value = learner.assessmentNumber || '';
        document.getElementById('parentName').value = learner.parentName;
        document.getElementById('parentPhone').value = learner.parentPhone;
        document.getElementById('parentEmail').value = learner.parentEmail;

        // Change form submission to update
        const form = document.getElementById('learnerForm');
        form.onsubmit = async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const updatedLearner = {
                fullName: formData.get('fullName'),
                gender: formData.get('gender'),
                dob: formData.get('dob'),
                grade: formData.get('grade'),
                assessmentNumber: formData.get('assessmentNumber') || undefined,
                parentName: formData.get('parentName'),
                parentPhone: formData.get('parentPhone'),
                parentEmail: formData.get('parentEmail')
            };

            try {
                const response = await fetch(`/api/learners?id=${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedLearner)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
                }

                alert('Learner updated successfully');
                form.reset();
                form.onsubmit = addLearner; // Reset form submission to add
                loadLearners();
            } catch (error) {
                console.error('Failed to update learner:', error.message);
                alert('Failed to update learner. Please try again.');
            }
        };
    } catch (error) {
        console.error('Failed to load learner for editing:', error.message);
        alert('Failed to load learner for editing. Please try again.');
    }
}

// Delete a learner
async function deleteLearner(id) {
    if (!confirm('Are you sure you want to delete this learner?')) return;

    try {
        const response = await fetch(`/api/learners?id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Learner deleted successfully');
        loadLearners();
    } catch (error) {
        console.error('Failed to delete learner:', error.message);
        alert('Failed to delete learner. Please try again.');
    }
}

// Load fees page
async function loadFees() {
    try {
        const fees = await fetchData('/api/fees');
        const tbody = document.querySelector('#feesTable tbody');
        tbody.innerHTML = '';

        fees.forEach(fee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fee.admissionNo}</td>
                <td>${fee.term}</td>
                <td>${fee.amountPaid}</td>
                <td>${fee.balance}</td>
                <td>
                    <button onclick="editFee('${fee._id}')">Edit</button>
                    <button onclick="deleteFee('${fee._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to load fees:', error.message);
        alert('Failed to load fees. Please try again later.');
    }
}

// Add a new fee
async function addFee(event) {
    event.preventDefault();
    const form = document.getElementById('feeForm');
    const formData = new FormData(form);
    const fee = {
        admissionNo: formData.get('admissionNo'),
        term: formData.get('term'),
        amountPaid: parseFloat(formData.get('amountPaid')),
        balance: parseFloat(formData.get('balance'))
    };

    try {
        const response = await fetch('/api/fees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fee)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Fee added successfully');
        form.reset();
        loadFees();
    } catch (error) {
        console.error('Failed to add fee:', error.message);
        alert('Failed to add fee. Please try again.');
    }
}

// Edit a fee
async function editFee(id) {
    try {
        const fee = await fetchData(`/api/fees?id=${id}`);
        document.getElementById('feeId').value = fee._id;
        document.getElementById('admissionNo').value = fee.admissionNo;
        document.getElementById('term').value = fee.term;
        document.getElementById('amountPaid').value = fee.amountPaid;
        document.getElementById('balance').value = fee.balance;

        const form = document.getElementById('feeForm');
        form.onsubmit = async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const updatedFee = {
                admissionNo: formData.get('admissionNo'),
                term: formData.get('term'),
                amountPaid: parseFloat(formData.get('amountPaid')),
                balance: parseFloat(formData.get('balance'))
            };

            try {
                const response = await fetch(`/api/fees?id=${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedFee)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
                }

                alert('Fee updated successfully');
                form.reset();
                form.onsubmit = addFee;
                loadFees();
            } catch (error) {
                console.error('Failed to update fee:', error.message);
                alert('Failed to update fee. Please try again.');
            }
        };
    } catch (error) {
        console.error('Failed to load fee for editing:', error.message);
        alert('Failed to load fee for editing. Please try again.');
    }
}

// Delete a fee
async function deleteFee(id) {
    if (!confirm('Are you sure you want to delete this fee?')) return;

    try {
        const response = await fetch(`/api/fees?id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Fee deleted successfully');
        loadFees();
    } catch (error) {
        console.error('Failed to delete fee:', error.message);
        alert('Failed to delete fee. Please try again.');
    }
}

// Load books page
async function loadBooks() {
    try {
        const books = await fetchData('/api/books');
        const tbody = document.querySelector('#booksTable tbody');
        tbody.innerHTML = '';

        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.admissionNo}</td>
                <td>${book.subject}</td>
                <td>${book.bookTitle}</td>
                <td>
                    <button onclick="editBook('${book._id}')">Edit</button>
                    <button onclick="deleteBook('${book._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to load books:', error.message);
        alert('Failed to load books. Please try again later.');
    }
}

// Add a new book
async function addBook(event) {
    event.preventDefault();
    const form = document.getElementById('bookForm');
    const formData = new FormData(form);
    const book = {
        admissionNo: formData.get('admissionNo'),
        subject: formData.get('subject'),
        bookTitle: formData.get('bookTitle')
    };

    try {
        const response = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Book added successfully');
        form.reset();
        loadBooks();
    } catch (error) {
        console.error('Failed to add book:', error.message);
        alert('Failed to add book. Please try again.');
    }
}

// Edit a book
async function editBook(id) {
    try {
        const book = await fetchData(`/api/books?id=${id}`);
        document.getElementById('bookId').value = book._id;
        document.getElementById('admissionNo').value = book.admissionNo;
        document.getElementById('subject').value = book.subject;
        document.getElementById('bookTitle').value = book.bookTitle;

        const form = document.getElementById('bookForm');
        form.onsubmit = async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const updatedBook = {
                admissionNo: formData.get('admissionNo'),
                subject: formData.get('subject'),
                bookTitle: formData.get('bookTitle')
            };

            try {
                const response = await fetch(`/api/books?id=${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedBook)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
                }

                alert('Book updated successfully');
                form.reset();
                form.onsubmit = addBook;
                loadBooks();
            } catch (error) {
                console.error('Failed to update book:', error.message);
                alert('Failed to update book. Please try again.');
            }
        };
    } catch (error) {
        console.error('Failed to load book for editing:', error.message);
        alert('Failed to load book for editing. Please try again.');
    }
}

// Delete a book
async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
        const response = await fetch(`/api/books?id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Book deleted successfully');
        loadBooks();
    } catch (error) {
        console.error('Failed to delete book:', error.message);
        alert('Failed to delete book. Please try again.');
    }
}

// Load class books page
async function loadClassBooks() {
    try {
        const classBooks = await fetchData('/api/classBooks');
        const tbody = document.querySelector('#classBooksTable tbody');
        tbody.innerHTML = '';

        classBooks.forEach(classBook => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${classBook.bookNumber}</td>
                <td>${classBook.subject}</td>
                <td>${classBook.description}</td>
                <td>${classBook.totalBooks}</td>
                <td>
                    <button onclick="editClassBook('${classBook._id}')">Edit</button>
                    <button onclick="deleteClassBook('${classBook._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to load class books:', error.message);
        alert('Failed to load class books. Please try again later.');
    }
}

// Add a new class book
async function addClassBook(event) {
    event.preventDefault();
    const form = document.getElementById('classBookForm');
    const formData = new FormData(form);
    const classBook = {
        bookNumber: formData.get('bookNumber'),
        subject: formData.get('subject'),
        description: formData.get('description'),
        totalBooks: parseInt(formData.get('totalBooks'))
    };

    try {
        const response = await fetch('/api/classBooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(classBook)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Class book added successfully');
        form.reset();
        loadClassBooks();
    } catch (error) {
        console.error('Failed to add class book:', error.message);
        alert('Failed to add class book. Please try again.');
    }
}

// Edit a class book
async function editClassBook(id) {
    try {
        const classBook = await fetchData(`/api/classBooks?id=${id}`);
        document.getElementById('classBookId').value = classBook._id;
        document.getElementById('bookNumber').value = classBook.bookNumber;
        document.getElementById('subject').value = classBook.subject;
        document.getElementById('description').value = classBook.description;
        document.getElementById('totalBooks').value = classBook.totalBooks;

        const form = document.getElementById('classBookForm');
        form.onsubmit = async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const updatedClassBook = {
                bookNumber: formData.get('bookNumber'),
                subject: formData.get('subject'),
                description: formData.get('description'),
                totalBooks: parseInt(formData.get('totalBooks'))
            };

            try {
                const response = await fetch(`/api/classBooks?id=${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedClassBook)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
                }

                alert('Class book updated successfully');
                form.reset();
                form.onsubmit = addClassBook;
                loadClassBooks();
            } catch (error) {
                console.error('Failed to update class book:', error.message);
                alert('Failed to update class book. Please try again.');
            }
        };
    } catch (error) {
        console.error('Failed to load class book for editing:', error.message);
        alert('Failed to load class book for editing. Please try again.');
    }
}

// Delete a class book
async function deleteClassBook(id) {
    if (!confirm('Are you sure you want to delete this class book?')) return;

    try {
        const response = await fetch(`/api/classBooks?id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Class book deleted successfully');
        loadClassBooks();
    } catch (error) {
        console.error('Failed to delete class book:', error.message);
        alert('Failed to delete class book. Please try again.');
    }
}

// Load fee structure page
async function loadFeeStructure() {
    try {
        const feeStructure = await fetchData('/api/feeStructure');
        document.getElementById('playgroup').value = feeStructure.playgroup || '';
        document.getElementById('pp1').value = feeStructure.pp1 || '';
        document.getElementById('pp2').value = feeStructure.pp2 || '';
        document.getElementById('grade1').value = feeStructure.grade1 || '';
        document.getElementById('grade2').value = feeStructure.grade2 || '';
        document.getElementById('grade3').value = feeStructure.grade3 || '';
        document.getElementById('grade4').value = feeStructure.grade4 || '';
        document.getElementById('grade5').value = feeStructure.grade5 || '';
        document.getElementById('grade6').value = feeStructure.grade6 || '';
        document.getElementById('grade7').value = feeStructure.grade7 || '';
        document.getElementById('grade8').value = feeStructure.grade8 || '';
        document.getElementById('grade9').value = feeStructure.grade9 || '';
    } catch (error) {
        console.error('Failed to load fee structure:', error.message);
        alert('Failed to load fee structure. Please try again later.');
    }
}

// Save fee structure
async function saveFeeStructure(event) {
    event.preventDefault();
    const form = document.getElementById('feeStructureForm');
    const formData = new FormData(form);
    const feeStructure = {
        playgroup: parseFloat(formData.get('playgroup')) || 0,
        pp1: parseFloat(formData.get('pp1')) || 0,
        pp2: parseFloat(formData.get('pp2')) || 0,
        grade1: parseFloat(formData.get('grade1')) || 0,
        grade2: parseFloat(formData.get('grade2')) || 0,
        grade3: parseFloat(formData.get('grade3')) || 0,
        grade4: parseFloat(formData.get('grade4')) || 0,
        grade5: parseFloat(formData.get('grade5')) || 0,
        grade6: parseFloat(formData.get('grade6')) || 0,
        grade7: parseFloat(formData.get('grade7')) || 0,
        grade8: parseFloat(formData.get('grade8')) || 0,
        grade9: parseFloat(formData.get('grade9')) || 0
    };

    try {
        const response = await fetch('/api/feeStructure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feeStructure)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Fee structure saved successfully');
    } catch (error) {
        console.error('Failed to save fee structure:', error.message);
        alert('Failed to save fee structure. Please try again.');
    }
}

// Load term settings page
async function loadTermSettings() {
    try {
        const termSettings = await fetchData('/api/termSettings');
        document.getElementById('currentTerm').value = termSettings.currentTerm;
        document.getElementById('currentYear').value = termSettings.currentYear;
    } catch (error) {
        console.error('Failed to load term settings:', error.message);
        alert('Failed to load term settings. Please try again later.');
    }
}

// Save term settings
async function saveTermSettings(event) {
    event.preventDefault();
    const form = document.getElementById('termSettingsForm');
    const formData = new FormData(form);
    const termSettings = {
        currentTerm: formData.get('currentTerm'),
        currentYear: parseInt(formData.get('currentYear'))
    };

    try {
        const response = await fetch('/api/termSettings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(termSettings)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('Term settings saved successfully');
        loadDashboardData(); // Update dashboard
    } catch (error) {
        console.error('Failed to save term settings:', error.message);
        alert('Failed to save term settings. Please try again.');
    }
}

// Start a new academic year
async function startNewAcademicYear() {
    if (!confirm('Are you sure you want to start a new academic year? This will archive current learners and update grades.')) return;

    try {
        const response = await fetch('/api/newAcademicYear', {
            method: 'POST'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert('New academic year started successfully');
        loadDashboardData();
        loadLearners();
    } catch (error) {
        console.error('Failed to start new academic year:', error.message);
        alert('Failed to start new academic year. Please try again.');
    }
}

// Load archived learners
async function loadArchivedLearners() {
    const year = document.getElementById('archiveYearSelect').value;
    if (!year) return;

    try {
        const learners = await fetchData(`/api/learnerArchives?year=${year}`);
        const tbody = document.querySelector('#archivedLearnersTable tbody');
        tbody.innerHTML = '';

        learners.forEach(learner => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${learner.fullName}</td>
                <td>${learner.gender}</td>
                <td>${learner.dob}</td>
                <td>${learner.grade}</td>
                <td>${learner.parentName}</td>
                <td>${learner.parentPhone}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to load archived learners:', error.message);
        alert('Failed to load archived learners. Please try again later.');
    }
}

// Initialize the app based on the current page
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        loadDashboardData();
    } else if (path === '/learners.html') {
        loadLearners();
        document.getElementById('learnerForm').addEventListener('submit', addLearner);
    } else if (path === '/fees.html') {
        loadFees();
        document.getElementById('feeForm').addEventListener('submit', addFee);
    } else if (path === '/books.html') {
        loadBooks();
        document.getElementById('bookForm').addEventListener('submit', addBook);
    } else if (path === '/classBooks.html') {
        loadClassBooks();
        document.getElementById('classBookForm').addEventListener('submit', addClassBook);
    } else if (path === '/feeStructure.html') {
        loadFeeStructure();
        document.getElementById('feeStructureForm').addEventListener('submit', saveFeeStructure);
    } else if (path === '/termSettings.html') {
        loadTermSettings();
        document.getElementById('termSettingsForm').addEventListener('submit', saveTermSettings);
        document.getElementById('newAcademicYearBtn')?.addEventListener('click', startNewAcademicYear);
    } else if (path === '/learnerArchive.html') {
        loadDashboardData(); // To populate the years dropdown
        document.getElementById('archiveYearSelect').addEventListener('change', loadArchivedLearners);
    }
});