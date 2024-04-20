typeDir="node_modules/@types/@iconscout"
mkdir -p ./$typeDir
cp iconScount.d.ts $typeDir
mv $typeDir/iconScount.d.ts $typeDir/index.d.ts