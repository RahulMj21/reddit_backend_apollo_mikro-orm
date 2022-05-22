import nodemailer from "nodemailer";

const sendMail = async (to: string, html: string) => {
  try {
    // let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "nzkqmzojkda3bgo3@ethereal.email",
        pass: "ScJ4ukN4aaWYCwNWSq",
      },
    });

    // console.log("user --> ", testAccount.user);
    // console.log("pass --> ", testAccount.pass);

    const info = await transporter.sendMail({
      from: '"Fred Foo 👻" <foo@example.com>',
      to,
      subject: "Change Password ✔",
      html,
    });
    if (info) return true;
  } catch (error: any) {
    console.log("mail sending error --> ", error);
    return false;
  }
};
export default sendMail;
