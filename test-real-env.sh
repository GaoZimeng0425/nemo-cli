#!/bin/bash

echo "🧪 Real Environment Test"
echo "========================="
echo ""

# 测试当前项目（pnpm）
echo "1️⃣  Testing current project (pnpm)"
echo "   Looking for: pnpm-lock.yaml"
if [ -f "pnpm-lock.yaml" ]; then
  echo "   ✅ Found pnpm-lock.yaml"
  echo "   📦 Expected detection: pnpm"
else
  echo "   ❌ pnpm-lock.yaml not found"
fi
echo ""

# 测试检测器
echo "2️⃣  Testing detector directly"
echo "   Creating test script..."

cat > /tmp/test-detection.mjs << 'EOF'
import { PackageManagerDetector } from '/Users/aa00930/Documents/Learn/nemo-cli/packages/shared/dist/index.js'

async function test() {
  const detector = new PackageManagerDetector(process.cwd())
  console.log('   📂 Current directory:', process.cwd())
  console.log('   🔍 Detecting package manager...')

  try {
    const result = await detector.detect(true)
    console.log('')
    console.log('   ✅ Detection Result:')
    console.log('      Package Manager:', result.packageManager)
    console.log('      Method:', result.method)
    console.log('      Is Available:', result.isAvailable)
    console.log('      Detected At:', result.detectedAt)
  } catch (error) {
    console.log('   ❌ Error:', error.message)
  }
}

test()
EOF

echo "   Running detection test..."
node /tmp/test-detection.mjs 2>&1
echo ""

# 测试适配器
echo "3️⃣  Testing adapter command generation"
echo "   Creating adapter test..."

cat > /tmp/test-adapter.mjs << 'EOF'
import { getAdapter } from '/Users/aa00930/Documents/Learn/nemo-cli/packages/shared/dist/index.js'

console.log('   📦 Testing adapter command generation:')
console.log('')

const adapters = ['npm', 'pnpm', 'yarn', 'bun']

adapters.forEach(pm => {
  const adapter = getAdapter(pm)
  const cmd = adapter.buildAddCommand(['react'], { saveDev: true, exact: true })

  console.log(`   ${pm.padEnd(6)}: ${adapter.command} ${cmd.slice(1).join(' ')}`)
})
EOF

node /tmp/test-adapter.mjs 2>&1
echo ""

echo "4️⃣  Testing np command (if built)"
echo "   Try: node packages/package/dist/index.js --help"
echo ""

echo "═══════════════════════════════════════"
echo "✅ Real environment test complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Check detection result above"
echo "   2. Verify adapter commands are correct"
echo "   3. Try np add command in a test project"
echo ""
