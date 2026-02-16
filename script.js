const registrationForm = document.getElementById("registrationForm");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");


const RAZORPAY_KEY_ID = "rzp_live_SGk0djRkKJ1Uft";

function generateRegistrationNo(lastNumber) {
    const nextNumber = lastNumber + 1;
    return `OSATPL01S${nextNumber.toString().padStart(4, "0")}`;
}

if (registrationForm) {
    registrationForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        submitBtn.disabled = true;
        formMessage.innerText = "";

        const formData = new FormData(registrationForm);
        const mobile = formData.get("mobile");
        const aadhar = formData.get("aadhar");
        const photo = formData.get("playerPhoto");

        // 0️⃣ Check if already registered
        const { data: existingPlayer, error: checkError } = await supabaseClient
            .from("player_registrations")
            .select("id")
            .or(`mobile_number.eq.${mobile},aadhar_number.eq.${aadhar}`)
            .maybeSingle();

        if (existingPlayer) {
            formMessage.style.color = "#ff4d8d";
            formMessage.innerText = "Error: This Mobile Number or Aadhar is already registered!";
            submitBtn.disabled = false;
            return;
        }

        // Photo Size Validation (5MB)
        if (photo.size > 5 * 1024 * 1024) {
            formMessage.innerText = "Error: Photo size must be less than 5MB.";
            submitBtn.disabled = false;
            return;
        }

        const options = {
            key: RAZORPAY_KEY_ID,
            amount: 1 * 100,
            currency: "INR",
            name: "SATPL 2026",
            description: "Registration Fee",

            handler: async function (response) {

                try {
                    // 1️⃣ Upload Photo
                    const timestamp = Date.now();
                    const ext = photo.name ? photo.name.split('.').pop() : 'jpg';
                    const fileName = `player_${timestamp}_${Math.floor(Math.random() * 1000)}.${ext}`;

                    const { error: uploadError } = await supabaseClient.storage
                        .from("player-photos")
                        .upload(fileName, photo);

                    if (uploadError) throw new Error("Photo Upload Failed: " + uploadError.message);

                    const { data } = supabaseClient.storage
                        .from("player-photos")
                        .getPublicUrl(fileName);

                    const photoUrl = data.publicUrl;

                    // 2️⃣ & 3️⃣ Save Data (Atomic-ish)
                    // We insert first to get the auto-incremented serial number (reg_serial or id)
                    const { data: insertedData, error: insertError } = await supabaseClient
                        .from("player_registrations")
                        .insert([{
                            player_name: formData.get("playerName"),
                            father_name: formData.get("fatherName"),
                            date_of_birth: formData.get("dob"),
                            aadhar_number: formData.get("aadhar"),
                            mobile_number: formData.get("mobile"),
                            whatsapp_number: formData.get("whatsapp"),
                            batting: formData.get("batting"),
                            bowling: formData.get("bowling"),
                            wicket_keeper: formData.get("wicketKeeper"),
                            photo_url: photoUrl,
                            payment_status: "paid",
                            payment_id: response.razorpay_payment_id
                        }])
                        .select();

                    if (insertError) throw new Error("Database Save Failed: " + insertError.message);
                    if (!insertedData || insertedData.length === 0) throw new Error("No data returned after insert.");

                    // Generate unique registration number based on the database serial
                    // Use reg_serial if it exists (auto-increment column), otherwise fall back to id
                    const serial = insertedData[0].reg_serial || insertedData[0].id;
                    const registrationNo = `OSATPL01S${(serial + 2000).toString().padStart(4, "0")}`;

                    // Update the record with the generated registration number
                    const { error: updateError } = await supabaseClient
                        .from("player_registrations")
                        .update({ registration_no: registrationNo })
                        .eq("id", insertedData[0].id);

                    if (updateError) throw new Error("Reg No Generation Failed: " + updateError.message);

                    window.location.href = `success.html?reg_no=${registrationNo}`;

                } catch (error) {
                    console.error("Registration Error:", error);
                    formMessage.style.color = "#ff4d8d";
                    formMessage.innerText = "Error: " + error.message;
                    submitBtn.disabled = false;
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    });
}
