const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Овде ќе се чуваат резервациите привремено во меморија (додека работи серверот)
let reservations = [];
const MAX_CAPACITY = 50; // Максимален број на маси/места во ресторанов

// Среден слој (Middleware)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Овозможи му на серверот да ги чита твоите статични фајлови (HTML, CSS, слики)
app.use(express.static(__dirname));

// --- РУТИ ЗА HTML СТРАНИЦИТЕ ---
// Овие рути гарантираат дека страниците ќе се отворат без разлика дали корисникот пишува со или без .html

// Главна страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Кошничка (Online Order)
app.get('/online-order', (req, res) => {
    res.sendFile(path.join(__dirname, 'online-order.html'));
});

// Master Chefs страница
app.get('/chefs', (req, res) => {
    res.sendFile(path.join(__dirname, 'chefs.html'));
});

// Quality Food страница
app.get('/quality-food', (req, res) => {
    res.sendFile(path.join(__dirname, 'quality-food.html'));
});


// --- API РУТИ ЗА REZERVACII ---

// 1. Рута за примање на резервација од формата
app.post('/book-table', (req, res) => {
    const { name, email, datetime, select_person, special_request } = req.body;
    
    // Пресметка на моментално резервирани места
    const currentBooked = reservations.reduce((sum, res) => sum + parseInt(res.people), 0);
    const requestedPeople = parseInt(select_person);

    // Проверка дали има доволно слободни места
    if (currentBooked + requestedPeople > MAX_CAPACITY) {
        return res.send(`
            <script>
                alert('Жалиме! Нема доволно слободни места за тој термин. Слободни места: ${MAX_CAPACITY - currentBooked}');
                window.location.href = '/index.html#reservation';
            </script>
        `);
    }

    // Зачувај ја резервацијата
    const newReservation = {
        id: reservations.length + 1,
        name,
        email,
        date: datetime,
        people: requestedPeople,
        request: special_request || "Нема"
    };

    reservations.push(newReservation);

    // Врати порака за успешност и редиректирај назад
    res.send(`
        <script>
            alert('Успешна резервација! Ве очекуваме, ${name}.');
            window.location.href = '/index.html';
        </script>
    `);
});

// 2. АПИ Рута за проверка на статус (Колку се резервирани)
app.get('/api/status', (req, res) => {
    const totalBookedPeople = reservations.reduce((sum, r) => sum + r.people, 0);
    res.json({
        bookedSeats: totalBookedPeople,
        maxCapacity: MAX_CAPACITY,
        availableSeats: MAX_CAPACITY - totalBookedPeople,
        totalReservations: reservations.length,
        allReservations: reservations // Листа од сите резервации
    });
});

// 3. Рута за бришење на резервација (ПОМЕСТЕНА НАД LISTEN)
app.delete('/api/reservations/:id', (req, res) => {
    const reservationId = parseInt(req.params.id);
    
    // Најди ја резервацијата по ID
    const index = reservations.findIndex(r => r.id === reservationId);
    
    if (index !== -1) {
        reservations.splice(index, 1); // Бришење од низата
        return res.json({ success: true, message: `Резервацијата #${reservationId} е успешно избришана.` });
    } else {
        return res.status(404).json({ success: false, message: "Резервацијата не е пронајдена." });
    }
});


// --- СТАРТУВАЊЕ НА СЕРВЕРОТ ---
// Ова мора секогаш да биде најдолу во фајлот!
app.listen(PORT, () => {
    console.log(`Серверот е стартуван на http://localhost:${PORT}`);
});
