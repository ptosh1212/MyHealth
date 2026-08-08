$files = Get-ChildItem -Path app, components -Recurse -Filter *.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Backgrounds
    $content = $content -replace 'bg-\[#0F110B\]', 'bg-slate-50'
    $content = $content -replace 'bg-\[#0a0e0a\]', 'bg-white'
    $content = $content -replace 'bg-\[#1a1410\]', 'bg-sky-50'
    $content = $content -replace 'bg-\[#131315\]', 'bg-white'
    
    # Text Colors
    $content = $content -replace 'text-white', 'text-slate-900'
    $content = $content -replace 'text-gray-400', 'text-slate-500'
    $content = $content -replace 'text-gray-300', 'text-slate-600'
    
    # Borders & Utilities
    $content = $content -replace 'border-white/10', 'border-slate-200'
    $content = $content -replace 'bg-white/5', 'bg-white'
    $content = $content -replace 'bg-white/10', 'bg-slate-100'
    
    # Buttons
    $content = $content -replace 'text-black', 'text-white'
    
    # Gradients
    $content = $content -replace 'from-\[#0a0e0a\] via-\[#0F110B\] to-\[#1a1410\]', 'from-sky-50 via-white to-blue-50'

    Set-Content -Path $file.FullName -Value $content -NoNewline
}