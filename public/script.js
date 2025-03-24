// script.js

// Utility function to fetch data with timeout and retry logic
async function fetchData(endpoint, retries = 1) {
    const baseUrl = '';
    const fullUrl = `${baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

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
                if (endpoint.includes('/api/learners') || endpoint.includes('/api/fees') || 
                    endpoint.includes('/api/books') || endpoint.includes('/api/classBooks') || 
                    endpoint.includes('/api/learnerArchives')) {
                    return [];
                } else if (endpoint.includes('/api/feeStructure')) {
                    return {};
                } else if (endpoint.includes('/api/termSettings')) {
                    return { currentTerm: 'Term 1', currentYear: new Date().getFullYear() };
                }
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Show a specific section based on the hash
function showSection(sectionId) {
    document.querySelectorAll('.content section').forEach(section => {
        section.style.display = 'none';
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    } else {
        console.error(`Section ${sectionId} not found`);
    }

    // Update active sidebar link
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
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
        const defaultTermSettings = { currentTerm: 'Term 1', currentYear: new Date().getFullYear() };
        updateDashboard([], [], [], [], {}, defaultTermSettings, []);
        alert('Unable to connect to the database. Displaying default values. Please try again later.');
    }
}

// Update dashboard UI
function updateDashboard(learners, fees, books, classBooks, feeStructure, termSettings, archivedYears) {
    // Ensure elements exist before updating
    const learnerCountEl = document.getElementById('learnerCount');
    const totalFeesPaidEl = document.getElementById('totalFeesPaid');
    const bookCountEl = document.getElementById('bookCount');
    const classBookCountEl = document.getElementById('classBookCount');
    const currentTermEl = document.getElementById('currentTerm');
    const currentYearEl = document.getElementById('currentYear');
    const archiveSelect = document.getElementById('learnerYearSelect');

    // Update learner count
    if (learnerCountEl) {
        learnerCountEl.textContent = learners.length;
    }

    // Update total fees paid
    if (totalFeesPaidEl) {
        const totalFeesPaid = fees.reduce((sum, fee) => sum + (fee.amountPaid || 0), 0);
        totalFeesPaidEl.textContent = totalFeesPaid;
    }

    // Update book count
    if (bookCountEl) {
        bookCountEl.textContent = books.length;
    }

    // Update class book count
    if (classBookCountEl) {
        classBookCountEl.textContent = classBooks.length;
    }

    // Update term settings
    if (currentTermEl) {
        currentTermEl.textContent = termSettings.currentTerm || 'Term 1';
    }
    if (currentYearEl) {
        currentYearEl.textContent = termSettings.currentYear || new Date().getFullYear();
    }

    // Populate archived years dropdown
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
        const tbody = document.querySelector('#learnersBody');
        if (tbody) {
            tbody.innerHTML = '';
            learners.forEach(learner => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${learner.admissionNo}</td>
                    <td>${learner.fullName}</td>
                    <td>${learner.gender}</td>
                    <td>${learner.dob}</td>
                    <td>${learner.grade}</td>
                    <td>${learner.assessmentNumber || ''}</td>
                    <td>${learner.parentName}</td>
                    <td>${learner.parentPhone}</td>
                    <td>
                        <button onclick="editLearner('${learner._id}')">Edit</button>
                        <button onclick="deleteLearner('${learner._id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
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
        return 'MPA-001';
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
        document.getElementById('addLearnerForm').style.display = 'none';
        loadLearners();
    } catch (error) {
        console.error('Failed to add learner:', error.message);
        alert(`Failed to add learner: ${error.message}. Please try again.`);
    }
}

// Edit a learner
async function editLearner(id) {
    try {
        const learners = await fetchData(`/api/learners`);
        const learner = learners.find(l => l._id === id);
        if (!learner) throw new Error('Learner not found');

        document.getElementById('editLearnerIndex').value = id;
        document.getElementById('editFullName').value = learner.fullName;
        document.getElementById('editGender').value = learner.gender;
        document.getElementById('editDob').value = learner.dob;
        document.getElementById('editGrade').value = learner.grade;
        document.getElementById('editAssessmentNumber').value = learner.assessmentNumber || '';
        document.getElementById('editParentName').value = learner.parentName;
        document.getElementById('editParentPhone').value = learner.parentPhone;
        document.getElementById('editParentEmail').value = learner.parentEmail;

        document.getElementById('editLearnerForm').style.display = 'block';
    } catch (error) {
        console.error('Failed to load learner for editing:', error.message);
        alert('Failed to load learner for editing. Please try again.');
    }
}

// Update a learner
async function updateLearner(event) {
    event.preventDefault();
    const form = document.getElementById('editLearnerFormElement');
    const id = document.getElementById('editLearnerIndex').value;
    const formData = new FormData(form);
    const updatedLearner = {
        fullName: formData.get('editFullName'),
        gender: formData.get('editGender'),
        dob: formData.get('editDob'),
        grade: formData.get('editGrade'),
        assessmentNumber: formData.get('editAssessmentNumber') || undefined,
        parentName: formData.get('editParentName'),
        parentPhone: formData.get('editParentPhone'),
        parentEmail: formData.get('editParentEmail')
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
        document.getElementById('editLearnerForm').style.display = 'none';
        loadLearners();
    } catch (error) {
        console.error('Failed to update learner:', error.message);
        alert('Failed to update learner. Please try again.');
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
        const learners = await fetchData('/api/learners');
        const tbody = document.querySelector('#feesBody');
        if (tbody) {
            tbody.innerHTML = '';
            fees.forEach(fee => {
                const learner = learners.find(l => l.admissionNo === fee.admissionNo);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${fee.admissionNo}</td>
                    <td>${learner ? learner.fullName : 'Unknown'}</td>
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
        }

        // Populate learner dropdowns for fees
        const feeAdmissionNo = document.getElementById('feeAdmissionNo');
        const editFeeAdmissionNo = document.getElementById('editFeeAdmissionNo');
        if (feeAdmissionNo && editFeeAdmissionNo) {
            feeAdmissionNo.innerHTML = '<option value="">Select Learner</option>';
            editFeeAdmissionNo.innerHTML = '<option value="">Select Learner</option>';
            learners.forEach(learner => {
                const option1 = document.createElement('option');
                const option2 = document.createElement('option');
                option1.value = learner.admissionNo;
                option1.textContent = `${learner.fullName} (${learner.admissionNo})`;
                option2.value = learner.admissionNo;
                option2.textContent = `${learner.fullName} (${learner.admissionNo})`;
                feeAdmissionNo.appendChild(option1);
                editFeeAdmissionNo.appendChild(option2);
            });
        }
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
        admissionNo: formData.get('feeAdmissionNo'),
        term: formData.get('term'),
        amountPaid: parseFloat(formData.get('amountPaid')),
        balance: 0 // Balance will be calculated on the server
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
        document.getElementById('addFeeForm').style.display = 'none';
        loadFees();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to add fee:', error.message);
        alert('Failed to add fee. Please try again.');
    }
}

// Edit a fee
async function editFee(id) {
    try {
        const fees = await fetchData('/api/fees');
        const fee = fees.find(f => f._id === id);
        if (!fee) throw new Error('Fee not found');

        document.getElementById('editFeeIndex').value = id;
        document.getElementById('editFeeAdmissionNo').value = fee.admissionNo;
        document.getElementById('editTerm').value = fee.term;
        document.getElementById('editAmountPaid').value = fee.amountPaid;

        document.getElementById('editFeeForm').style.display = 'block';
    } catch (error) {
        console.error('Failed to load fee for editing:', error.message);
        alert('Failed to load fee for editing. Please try again.');
    }
}

// Update a fee
async function updateFee(event) {
    event.preventDefault();
    const form = document.getElementById('editFeeFormElement');
    const id = document.getElementById('editFeeIndex').value;
    const formData = new FormData(form);
    const updatedFee = {
        admissionNo: formData.get('editFeeAdmissionNo'),
        term: formData.get('editTerm'),
        amountPaid: parseFloat(formData.get('editAmountPaid'))
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
        document.getElementById('editFeeForm').style.display = 'none';
        loadFees();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to update fee:', error.message);
        alert('Failed to update fee. Please try again.');
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
        loadDashboardData();
    } catch (error) {
        console.error('Failed to delete fee:', error.message);
        alert('Failed to delete fee. Please try again.');
    }
}

// Load books page
async function loadBooks() {
    try {
        const books = await fetchData('/api/books');
        const learners = await fetchData('/api/learners');
        const tbody = document.querySelector('#booksBody');
        if (tbody) {
            tbody.innerHTML = '';
            books.forEach(book => {
                const learner = learners.find(l => l.admissionNo === book.admissionNo);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${book.admissionNo}</td>
                    <td>${learner ? learner.fullName : 'Unknown'}</td>
                    <td>${book.subject}</td>
                    <td>${book.bookTitle}</td>
                    <td>
                        <button onclick="editBook('${book._id}')">Edit</button>
                        <button onclick="deleteBook('${book._id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        // Populate learner dropdowns for books
        const bookAdmissionNo = document.getElementById('bookAdmissionNo');
        const editBookAdmissionNo = document.getElementById('editBookAdmissionNo');
        if (bookAdmissionNo && editBookAdmissionNo) {
            bookAdmissionNo.innerHTML = '<option value="">Select Learner</option>';
            editBookAdmissionNo.innerHTML = '<option value="">Select Learner</option>';
            learners.forEach(learner => {
                const option1 = document.createElement('option');
                const option2 = document.createElement('option');
                option1.value = learner.admissionNo;
                option1.textContent = `${learner.fullName} (${learner.admissionNo})`;
                option2.value = learner.admissionNo;
                option2.textContent = `${learner.fullName} (${learner.admissionNo})`;
                bookAdmissionNo.appendChild(option1);
                editBookAdmissionNo.appendChild(option2);
            });
        }
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
        admissionNo: formData.get('bookAdmissionNo'),
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
        document.getElementById('addBookForm').style.display = 'none';
        loadBooks();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to add book:', error.message);
        alert('Failed to add book. Please try again.');
    }
}

// Edit a book
async function editBook(id) {
    try {
        const books = await fetchData('/api/books');
        const book = books.find(b => b._id === id);
        if (!book) throw new Error('Book not found');

        document.getElementById('editBookIndex').value = id;
        document.getElementById('editBookAdmissionNo').value = book.admissionNo;
        document.getElementById('editSubject').value = book.subject;
        document.getElementById('editBookTitle').value = book.bookTitle;

        document.getElementById('editBookForm').style.display = 'block';
    } catch (error) {
        console.error('Failed to load book for editing:', error.message);
        alert('Failed to load book for editing. Please try again.');
    }
}

// Update a book
async function updateBook(event) {
    event.preventDefault();
    const form = document.getElementById('editBookFormElement');
    const id = document.getElementById('editBookIndex').value;
    const formData = new FormData(form);
    const updatedBook = {
        admissionNo: formData.get('editBookAdmissionNo'),
        subject: formData.get('editSubject'),
        bookTitle: formData.get('editBookTitle')
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
        document.getElementById('editBookForm').style.display = 'none';
        loadBooks();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to update book:', error.message);
        alert('Failed to update book. Please try again.');
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
        loadDashboardData();
    } catch (error) {
        console.error('Failed to delete book:', error.message);
        alert('Failed to delete book. Please try again.');
    }
}

// Load class books page
async function loadClassBooks() {
    try {
        const classBooks = await fetchData('/api/classBooks');
        const tbody = document.querySelector('#classBooksBody');
        if (tbody) {
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
        }
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
        subject: formData.get('classSubject'),
        description: formData.get('bookDescription'),
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
        document.getElementById('addClassBookForm').style.display = 'none';
        loadClassBooks();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to add class book:', error.message);
        alert('Failed to add class book. Please try again.');
    }
}

// Edit a class book
async function editClassBook(id) {
    try {
        const classBooks = await fetchData('/api/classBooks');
        const classBook = classBooks.find(cb => cb._id === id);
        if (!classBook) throw new Error('Class book not found');

        document.getElementById('editClassBookIndex').value = id;
        document.getElementById('editBookNumber').value = classBook.bookNumber;
        document.getElementById('editClassSubject').value = classBook.subject;
        document.getElementById('editBookDescription').value = classBook.description;
        document.getElementById('editTotalBooks').value = classBook.totalBooks;

        document.getElementById('editClassBookForm').style.display = 'block';
    } catch (error) {
        console.error('Failed to load class book for editing:', error.message);
        alert('Failed to load class book for editing. Please try again.');
    }
}

// Update a class book
async function updateClassBook(event) {
    event.preventDefault();
    const form = document.getElementById('editClassBookFormElement');
    const id = document.getElementById('editClassBookIndex').value;
    const formData = new FormData(form);
    const updatedClassBook = {
        bookNumber: formData.get('editBookNumber'),
        subject: formData.get('editClassSubject'),
        description: formData.get('editBookDescription'),
        totalBooks: parseInt(formData.get('editTotalBooks'))
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
        document.getElementById('editClassBookForm').style.display = 'none';
        loadClassBooks();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to update class book:', error.message);
        alert('Failed to update class book. Please try again.');
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
        loadDashboardData();
    } catch (error) {
        console.error('Failed to delete class book:', error.message);
        alert('Failed to delete class book. Please try again.');
    }
}

// Load fee structure page
async function loadFeeStructure() {
    try {
        const feeStructure = await fetchData('/api/feeStructure');
        document.getElementById('playgroupFee').value = feeStructure.playgroup || '';
        document.getElementById('pp1Fee').value = feeStructure.pp1 || '';
        document.getElementById('pp2Fee').value = feeStructure.pp2 || '';
        document.getElementById('grade1Fee').value = feeStructure.grade1 || '';
        document.getElementById('grade2Fee').value = feeStructure.grade2 || '';
        document.getElementById('grade3Fee').value = feeStructure.grade3 || '';
        document.getElementById('grade4Fee').value = feeStructure.grade4 || '';
        document.getElementById('grade5Fee').value = feeStructure.grade5 || '';
        document.getElementById('grade6Fee').value = feeStructure.grade6 || '';
        document.getElementById('grade7Fee').value = feeStructure.grade7 || '';
        document.getElementById('grade8Fee').value = feeStructure.grade8 || '';
        document.getElementById('grade9Fee').value = feeStructure.grade9 || '';
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
        playgroup: parseFloat(formData.get('playgroupFee')) || 0,
        pp1: parseFloat(formData.get('pp1Fee')) || 0,
        pp2: parseFloat(formData.get('pp2Fee')) || 0,
        grade1: parseFloat(formData.get('grade1Fee')) || 0,
        grade2: parseFloat(formData.get('grade2Fee')) || 0,
        grade3: parseFloat(formData.get('grade3Fee')) || 0,
        grade4: parseFloat(formData.get('grade4Fee')) || 0,
        grade5: parseFloat(formData.get('grade5Fee')) || 0,
        grade6: parseFloat(formData.get('grade6Fee')) || 0,
        grade7: parseFloat(formData.get('grade7Fee')) || 0,
        grade8: parseFloat(formData.get('grade8Fee')) || 0,
        grade9: parseFloat(formData.get('grade9Fee')) || 0
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
        document.getElementById('currentTerm').value = termSettings.currentTerm || 'Term 1';
        document.getElementById('currentYear').value = termSettings.currentYear || new Date().getFullYear();
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
        loadDashboardData();
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

// Download functions for Excel, Word, and PDF
function downloadExcel(data, filename) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

function downloadWord(elementId, filename) {
    const content = document.getElementById(elementId).outerHTML;
    const converted = htmlDocx.asBlob(content);
    const url = URL.createObjectURL(converted);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadPDF(elementId, filename) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.autoTable({ html: `#${elementId} table` });
    doc.save(`${filename}.pdf`);
}

// Handle navigation and section loading
function handleNavigation(sectionId) {
    showSection(sectionId);
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'learners':
            loadLearners();
            break;
        case 'fees':
            loadFees();
            break;
        case 'books':
            loadBooks();
            break;
        case 'classBooks':
            loadClassBooks();
            break;
        case 'feeStructure':
            loadFeeStructure();
            break;
        case 'termSettings':
            loadTermSettings();
            break;
        default:
            console.warn(`No handler for section: ${sectionId}`);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Show login modal
    const loginModal = document.getElementById('loginModal');
    const mainApp = document.getElementById('mainApp');
    loginModal.style.display = 'block';

    // Handle login
    document.getElementById('loginForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (username === 'admin' && password === 'password') {
            loginModal.style.display = 'none';
            mainApp.style.display = 'block';
            // Load initial section based on hash
            const hash = window.location.hash.slice(1) || 'dashboard';
            handleNavigation(hash);
        } else {
            alert('Invalid credentials');
        }
    });

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        mainApp.style.display = 'none';
        loginModal.style.display = 'block';
        window.location.hash = ''; // Reset hash on logout
    });

    // Handle hash change for navigation
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || 'dashboard';
        handleNavigation(hash);
    });

    // Handle sidebar link clicks
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', (event) => {
            const sectionId = link.getAttribute('href').slice(1);
            if (sectionId === 'logoutBtn') return; // Skip logout link
            event.preventDefault(); // Prevent default behavior
            window.location.hash = sectionId; // Update hash
            handleNavigation(sectionId); // Manually handle navigation
        });
    });

    // Modal handling
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('.cancel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });

    // Open modals
    document.querySelector('.add-learner-btn').addEventListener('click', () => {
        document.getElementById('addLearnerForm').style.display = 'block';
    });
    document.querySelector('.add-fee-btn').addEventListener('click', () => {
        document.getElementById('addFeeForm').style.display = 'block';
    });
    document.querySelector('.add-book-btn').addEventListener('click', () => {
        document.getElementById('addBookForm').style.display = 'block';
    });
    document.querySelector('.add-class-book-btn').addEventListener('click', () => {
        document.getElementById('addClassBookForm').style.display = 'block';
    });

    // Form submissions
    document.getElementById('learnerForm').addEventListener('submit', addLearner);
    document.getElementById('editLearnerFormElement').addEventListener('submit', updateLearner);
    document.getElementById('feeForm').addEventListener('submit', addFee);
    document.getElementById('editFeeFormElement').addEventListener('submit', updateFee);
    document.getElementById('bookForm').addEventListener('submit', addBook);
    document.getElementById('editBookFormElement').addEventListener('submit', updateBook);
    document.getElementById('classBookForm').addEventListener('submit', addClassBook);
    document.getElementById('editClassBookFormElement').addEventListener('submit', updateClassBook);
    document.getElementById('feeStructureForm').addEventListener('submit', saveFeeStructure);
    document.getElementById('termSettingsForm').addEventListener('submit', saveTermSettings);

    // Download buttons
    document.getElementById('downloadLearnersExcelBtn').addEventListener('click', () => {
        const learners = Array.from(document.querySelectorAll('#learnersBody tr')).map(row => ({
            AdmissionNo: row.cells[0].textContent,
            FullName: row.cells[1].textContent,
            Gender: row.cells[2].textContent,
            DoB: row.cells[3].textContent,
            Grade: row.cells[4].textContent,
            AssessmentNumber: row.cells[5].textContent,
            ParentName: row.cells[6].textContent,
            ParentContact: row.cells[7].textContent
        }));
        downloadExcel(learners, 'learners');
    });
    document.getElementById('downloadLearnersWordBtn').addEventListener('click', () => downloadWord('learners', 'learners'));
    document.getElementById('downloadLearnersPdfBtn').addEventListener('click', () => downloadPDF('learners', 'learners'));

    document.getElementById('downloadFeesExcelBtn').addEventListener('click', () => {
        const fees = Array.from(document.querySelectorAll('#feesBody tr')).map(row => ({
            AdmissionNo: row.cells[0].textContent,
            FullName: row.cells[1].textContent,
            Term: row.cells[2].textContent,
            AmountPaid: row.cells[3].textContent,
            Balance: row.cells[4].textContent
        }));
        downloadExcel(fees, 'fees');
    });
    document.getElementById('downloadFeesWordBtn').addEventListener('click', () => downloadWord('fees', 'fees'));
    document.getElementById('downloadFeesPdfBtn').addEventListener('click', () => downloadPDF('fees', 'fees'));

    document.getElementById('downloadBooksExcelBtn').addEventListener('click', () => {
        const books = Array.from(document.querySelectorAll('#booksBody tr')).map(row => ({
            AdmissionNo: row.cells[0].textContent,
            FullName: row.cells[1].textContent,
            Subject: row.cells[2].textContent,
            BookTitle: row.cells[3].textContent
        }));
        downloadExcel(books, 'books');
    });
    document.getElementById('downloadBooksWordBtn').addEventListener('click', () => downloadWord('books', 'books'));
    document.getElementById('downloadBooksPdfBtn').addEventListener('click', () => downloadPDF('books', 'books'));
});
