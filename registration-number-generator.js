// centralized registration number generator

function generateRegistrationNumber() {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero indexed
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    // Generate a unique registration number
    const registrationNumber = `REG-${year}-${month}-${day}-${hours}${minutes}${seconds}`;
    return registrationNumber;
}

console.log(generateRegistrationNumber());
