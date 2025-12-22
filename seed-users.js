const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const employees = [
  { username: 'mhodder', id: 'Jan-0161', fullName: 'Mark Hodder', role: 'admin' },
  { username: 'csakaki', id: 'Oct-1071', fullName: 'Carrie-Ann Sakaki', role: 'user' },
  { username: 'kenziesh', id: 'Mar-3198', fullName: 'Kenzie Sakaki-Hodder', role: 'user' },
  { username: 'mfricker', id: 'Apr-3084', fullName: 'Matthew Fricker', role: 'user' },
  { username: 'drobertson', id: 'Feb-1089', fullName: 'Derek Robertson', role: 'user' },
  { username: 'dwayneh', id: 'Sep-2760', fullName: 'Dwayne Hagkvist', role: 'user' },
  { username: 'jfrancis', id: 'Nov-1592', fullName: 'Jesse Francis', role: 'user' },
  { username: 'fweber', id: 'Dec-1868', fullName: 'Frank Weber', role: 'user' },
  { username: 'tsutherland', id: 'Jul-0706', fullName: 'Tyson Sutherland', role: 'user' },
  { username: 'wsutherland', id: 'Sep-2865', fullName: 'Bill Sutherland', role: 'user' },
  { username: 'aj', id: '999', fullName: 'AJ', role: 'user' },
]

async function main() {
  // Delete old data
  await prisma.workHour.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.user.deleteMany()

  console.log('🗑️  Cleared old data\n')

  // Create admin with new password
  const adminPassword = await bcrypt.hash('Hodder123!', 12)
  await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      role: 'admin'
    }
  })
  await prisma.employee.create({
    data: {
      id: '0',
      name: 'admin',
      fullName: 'Administrator',
      email: 'admin@company.com'
    }
  })
  console.log('✅ Created: admin (password: Hodder123!)')

  // Create all employees
  for (const emp of employees) {
    // For aj, use romeo10. For others, use their employee ID
    const password = emp.username === 'aj' ? 'romeo10' : emp.id
    const hashedPassword = await bcrypt.hash(password, 12)
    
    await prisma.user.create({
      data: {
        username: emp.username,
        password: hashedPassword,
        role: emp.role
      }
    })
    
    await prisma.employee.create({
      data: {
        id: emp.id,
        name: emp.username,
        fullName: emp.fullName,
      }
    })
    
    console.log(`✅ Created: ${emp.username} (password: ${password})`)
  }

  console.log('\n🎉 All users created successfully!')
  console.log('\n📋 Login credentials:')
  console.log('   admin / Hodder123!')
  console.log('   aj / romeo10')
  console.log('   All others: username / their employee ID')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())