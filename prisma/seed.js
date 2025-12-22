import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const employees = [
  { username: 'admin', id: '0', fullName: 'Administrator', password: 'Hodder123!', role: 'admin' },
  { username: 'mhodder', id: 'Jan-0161', fullName: 'Mark Hodder', password: 'Jan-0161', role: 'admin' },
  { username: 'csakaki', id: 'Oct-1071', fullName: 'Carrie-Ann Sakaki', password: 'Oct-1071', role: 'user' },
  { username: 'kenziesh', id: 'Mar-3198', fullName: 'Kenzie Sakaki-Hodder', password: 'Mar-3198', role: 'user' },
  { username: 'mfricker', id: 'Apr-3084', fullName: 'Matthew Fricker', password: 'Apr-3084', role: 'user' },
  { username: 'drobertson', id: 'Feb-1089', fullName: 'Derek Robertson', password: 'Feb-1089', role: 'user' },
  { username: 'dwayneh', id: 'Sep-2760', fullName: 'Dwayne Hagkvist', password: 'Sep-2760', role: 'user' },
  { username: 'jfrancis', id: 'Nov-1592', fullName: 'Jesse Francis', password: 'Nov-1592', role: 'user' },
  { username: 'fweber', id: 'Dec-1868', fullName: 'Frank Weber', password: 'Dec-1868', role: 'user' },
  { username: 'tsutherland', id: 'Jul-0706', fullName: 'Tyson Sutherland', password: 'Jul-0706', role: 'user' },
  { username: 'wsutherland', id: 'Sep-2865', fullName: 'Bill Sutherland', password: 'Sep-2865', role: 'user' },
  { username: 'aj', id: '999', fullName: 'AJ', password: 'romeo10', role: 'user' },
]

async function main() {
  console.log('🌱 Starting seed...')

  for (const emp of employees) {
    const hashedPassword = await bcrypt.hash(emp.password, 12)
    
    // Create or update User
    await prisma.user.upsert({
      where: { username: emp.username },
      update: { password: hashedPassword, role: emp.role },
      create: {
        username: emp.username,
        password: hashedPassword,
        role: emp.role
      }
    })
    
    // Create or update Employee
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: { name: emp.username, fullName: emp.fullName },
      create: {
        id: emp.id,
        name: emp.username,
        fullName: emp.fullName
      }
    })
    
    console.log(`✅ Seeded: ${emp.username}`)
  }

  console.log('✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })