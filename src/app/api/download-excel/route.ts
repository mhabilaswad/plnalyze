// FILE: app/api/download-excel/route.ts
// NOTE: This route currently generates Excel locally. If you want to proxy to backend serpo, update here.
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from 'xlsx';
import type { InferenceResult } from "@/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const inference: InferenceResult = body.inference;

        if (!inference || !inference.daftar_tim) {
            return NextResponse.json(
                { error: "Data inference tidak valid" },
                { status: 400 }
            );
        }

        if (!inference.detail_kasus || inference.detail_kasus.length === 0) {
            return NextResponse.json(
                { error: "Data detail kasus tidak tersedia" },
                { status: 400 }
            );
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Sheet 1: Data Lengkap Per Kasus
        const kasusData = [
            ['DATA LENGKAP KASUS GANGGUAN'],
            [''],
            [
                'No Tiket',
                'Nama Service', 
                'SID',
                'Tim SERPO',
                'Durasi (Menit)',
                'Durasi (Jam)', 
                'Penyebab',
                'Kategori Penyebab',
                'Keterangan',
                'Prediksi Kinerja',
                'Ada Kendala',
                'Status SLA'
            ]
        ];

        // Add all case data
        inference.detail_kasus.forEach(kasus => {
            const statusSLA = kasus.durasi_jam < 4 ? 'Patuh SLA' : 'Tidak Patuh SLA';
            kasusData.push([
                kasus.no_tiket,
                kasus.nama_service,
                kasus.sid,
                kasus.tim_serpo,
                kasus.durasi_menit.toString(),
                kasus.durasi_jam.toFixed(2),
                kasus.penyebab,
                kasus.kategori_penyebab,
                kasus.keterangan,
                kasus.prediksi_kinerja,
                kasus.ada_kendala ? 'Ya' : 'Tidak',
                statusSLA
            ]);
        });

        const kasusSheet = XLSX.utils.aoa_to_sheet(kasusData);
        
        // Set column widths for kasus sheet
        kasusSheet['!cols'] = [
            { width: 15 }, // No Tiket
            { width: 30 }, // Nama Service
            { width: 15 }, // SID
            { width: 20 }, // Tim SERPO
            { width: 15 }, // Durasi Menit
            { width: 15 }, // Durasi Jam
            { width: 50 }, // Penyebab
            { width: 20 }, // Kategori
            { width: 40 }, // Keterangan
            { width: 18 }, // Prediksi Kinerja
            { width: 12 }, // Ada Kendala
            { width: 18 }  // Status SLA
        ];

        XLSX.utils.book_append_sheet(workbook, kasusSheet, "Data Lengkap");

        // Sheet 2: Ringkasan Per Tim
        const ringkasanData = [
            ['RINGKASAN KINERJA PER TIM'],
            [''],
            ['Nama Tim', 'Jumlah Kasus', 'Durasi Rata-rata (jam)', 'Kinerja Mayoritas', 'Penyebab Dominan', 'Status SLA']
        ];

        inference.daftar_tim.forEach(tim => {
            const statusSLA = tim.durasi_rata2 < 4 ? 'Patuh SLA' : 'Perlu Perbaikan';
            ringkasanData.push([
                tim.nama_tim,
                tim.jumlah_kasus.toString(),
                tim.durasi_rata2.toFixed(2),
                tim.kinerja_mayoritas,
                tim.penyebab_mayoritas,
                statusSLA
            ]);
        });

        const ringkasanSheet = XLSX.utils.aoa_to_sheet(ringkasanData);
        
        // Set column widths for ringkasan
        ringkasanSheet['!cols'] = [
            { width: 20 }, // Nama Tim
            { width: 15 }, // Jumlah Kasus
            { width: 20 }, // Durasi
            { width: 18 }, // Kinerja
            { width: 50 }, // Penyebab Dominan
            { width: 18 }  // Status SLA
        ];

        XLSX.utils.book_append_sheet(workbook, ringkasanSheet, "Ringkasan Tim");

        // Sheet 3: Data Kasus Berdasarkan Tim
        inference.daftar_tim.forEach(tim => {
            const kasusTimData = [
                [`DATA KASUS - TIM ${tim.nama_tim.toUpperCase()}`],
                [''],
                [
                    'No Tiket',
                    'Nama Service',
                    'SID', 
                    'Durasi (Menit)',
                    'Durasi (Jam)',
                    'Penyebab',
                    'Kategori Penyebab',
                    'Keterangan',
                    'Prediksi Kinerja',
                    'Ada Kendala',
                    'Status SLA'
                ]
            ];

            // Filter kasus untuk tim ini
            const kasusPerTim = inference.detail_kasus?.filter(kasus => kasus.tim_serpo === tim.nama_tim) || [];
            
            kasusPerTim.forEach(kasus => {
                const statusSLA = kasus.durasi_jam < 4 ? 'Patuh SLA' : 'Tidak Patuh SLA';
                kasusTimData.push([
                    kasus.no_tiket,
                    kasus.nama_service,
                    kasus.sid,
                    kasus.durasi_menit.toString(),
                    kasus.durasi_jam.toFixed(2),
                    kasus.penyebab,
                    kasus.kategori_penyebab,
                    kasus.keterangan,
                    kasus.prediksi_kinerja,
                    kasus.ada_kendala ? 'Ya' : 'Tidak',
                    statusSLA
                ]);
            });

            const timSheet = XLSX.utils.aoa_to_sheet(kasusTimData);
            
            // Set column widths
            timSheet['!cols'] = [
                { width: 15 }, // No Tiket
                { width: 30 }, // Nama Service
                { width: 15 }, // SID
                { width: 15 }, // Durasi Menit
                { width: 15 }, // Durasi Jam
                { width: 50 }, // Penyebab
                { width: 20 }, // Kategori
                { width: 40 }, // Keterangan
                { width: 18 }, // Prediksi Kinerja
                { width: 12 }, // Ada Kendala
                { width: 18 }  // Status SLA
            ];

            // Clean sheet name for Excel (max 31 chars, no special chars)
            const sheetName = tim.nama_tim.replace(/[\\/:*?[\]]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(workbook, timSheet, `Tim ${sheetName}`);
        });

        // Sheet 4: Analisis SLA
        const slaData = [
            ['ANALISIS KEPATUHAN SLA'],
            [''],
            ['Kriteria: Durasi ≤ 4 jam = Patuh SLA'],
            [''],
            ['No Tiket', 'Tim SERPO', 'Nama Service', 'Durasi (Jam)', 'Status SLA', 'Selisih dari Target (Jam)']
        ];

        if (inference.detail_kasus) {
            inference.detail_kasus.forEach(kasus => {
                const targetSLA = 4;
                const selisih = kasus.durasi_jam - targetSLA;
                const statusSLA = kasus.durasi_jam <= targetSLA ? 'Patuh SLA' : 'Tidak Patuh SLA';
                
                slaData.push([
                    kasus.no_tiket,
                    kasus.tim_serpo,
                    kasus.nama_service,
                    kasus.durasi_jam.toFixed(2),
                    statusSLA,
                    selisih.toFixed(2)
                ]);
            });
        }

        const slaSheet = XLSX.utils.aoa_to_sheet(slaData);
        
        // Set column widths for SLA
        slaSheet['!cols'] = [
            { width: 15 }, // No Tiket
            { width: 20 }, // Tim SERPO
            { width: 30 }, // Nama Service
            { width: 15 }, // Durasi
            { width: 18 }, // Status
            { width: 25 }  // Selisih
        ];

        XLSX.utils.book_append_sheet(workbook, slaSheet, "Analisis SLA");

        // Sheet 2: Detail Tim
        const detailData = [
            ['DETAIL KINERJA TIM SERPO'],
            [''],
            ['Nama Tim', 'Jumlah Kasus', 'Durasi Rata-rata (jam)', 'Kinerja Mayoritas', 'Penyebab Dominan', 'Status SLA']
        ];

        inference.daftar_tim.forEach(tim => {
            const statusSLA = tim.durasi_rata2 < 4 ? 'Patuh SLA' : 'Perlu Perbaikan';
            detailData.push([
                tim.nama_tim,
                tim.jumlah_kasus.toString(),
                tim.durasi_rata2.toFixed(2),
                tim.kinerja_mayoritas,
                tim.penyebab_mayoritas,
                statusSLA
            ]);
        });

        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
        
        // Set column widths for detail
        detailSheet['!cols'] = [
            { width: 20 }, // Nama Tim
            { width: 15 }, // Jumlah Kasus
            { width: 20 }, // Durasi
            { width: 18 }, // Kinerja
            { width: 50 }, // Penyebab Dominan
            { width: 18 }  // Status SLA
        ];

        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { 
            bookType: 'xlsx', 
            type: 'buffer',
            compression: true 
        });

        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `Data_Lengkap_Kasus_SERPO_${timestamp}.xlsx`;

        // Return Excel file
        return new NextResponse(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': excelBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error("/api/download-excel error:", error);
        return NextResponse.json({ 
            error: "Gagal membuat file Excel",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
