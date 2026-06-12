import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const employeePassword = await bcrypt.hash("Employee@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cardesk.com" },
    update: {},
    create: {
      email: "admin@cardesk.com",
      name: "Admin User",
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@cardesk.com" },
    update: {},
    create: {
      email: "employee@cardesk.com",
      name: "Jane Smith",
      password: employeePassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  console.log("Seed complete:");
  console.log(`  Admin:    ${admin.email}  / Admin@123`);
  console.log(`  Employee: ${employee.email} / Employee@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
