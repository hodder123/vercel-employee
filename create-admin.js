const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  // Create admin user
  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    }
  })
  
  // Create employee record for admin
  await prisma.employee.create({
    data: {
      id: '1',
      name: 'admin',
      fullName: 'Administrator',
      email: 'admin@company.com'
    }
  })
  
  console.log('✅ Admin user created!')
  console.log('Username: admin')
  console.log('Password: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())