
import pyttsx3
from pypdf import PdfReader
import os
import tkinter as tk
from tkinter import filedialog, ttk, messagebox, StringVar, IntVar
from tkinter.ttk import Progressbar
import threading
import tempfile

class PDFToAudioConverter:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("PDF to Audio Converter")
        self.root.geometry("600x500")
        self.root.configure(bg='#6A5ACD')  # Purple background

        # Initialize text-to-speech engine
        self.engine = pyttsx3.init()

        # Variables
        self.pdf_path = StringVar()
        self.output_path = StringVar()
        self.speed = IntVar(value=200)  # Default speed
        self.voice_gender = StringVar(value="male")
        self.start_page = IntVar(value=1)
        self.end_page = IntVar(value=1)
        self.total_pages = IntVar(value=1)

        self.setup_ui()
        self.setup_voices()

    def setup_voices(self):
        """Setup available voices"""
        try:
            voices = self.engine.getProperty('voices')
            self.voices = voices
            if len(voices) >= 2:
                self.male_voice = voices[0].id
                self.female_voice = voices[1].id if len(voices) > 1 else voices[0].id
            else:
                self.male_voice = voices[0].id if voices else None
                self.female_voice = voices[0].id if voices else None
        except:
            self.male_voice = None
            self.female_voice = None

    def setup_ui(self):
        """Setup the user interface"""
        # Title
        title_frame = tk.Frame(self.root, bg='#6A5ACD')
        title_frame.pack(pady=20)

        title_label = tk.Label(title_frame, text="PDF to Audio Converter", 
                              font=("Arial", 24, "bold"), fg="white", bg='#6A5ACD')
        title_label.pack()

        # Main frame
        main_frame = tk.Frame(self.root, bg='white', relief='raised', bd=2)
        main_frame.pack(padx=20, pady=10, fill='both', expand=True)

        # PDF Selection
        pdf_frame = tk.Frame(main_frame, bg='white')
        pdf_frame.pack(fill='x', padx=20, pady=10)

        tk.Label(pdf_frame, text="Select PDF File:", font=("Arial", 12, "bold"), bg='white').pack(anchor='w')

        pdf_select_frame = tk.Frame(pdf_frame, bg='white')
        pdf_select_frame.pack(fill='x', pady=5)

        tk.Entry(pdf_select_frame, textvariable=self.pdf_path, font=("Arial", 10), 
                width=50, state='readonly').pack(side='left', fill='x', expand=True)
        tk.Button(pdf_select_frame, text="Browse", command=self.select_pdf_file,
                 bg='#6A5ACD', fg='white', font=("Arial", 10)).pack(side='right', padx=(5,0))

        # Page Range
        page_frame = tk.Frame(main_frame, bg='white')
        page_frame.pack(fill='x', padx=20, pady=10)

        tk.Label(page_frame, text="Page Range:", font=("Arial", 12, "bold"), bg='white').pack(anchor='w')

        page_controls = tk.Frame(page_frame, bg='white')
        page_controls.pack(fill='x', pady=5)

        tk.Label(page_controls, text="From:", bg='white').pack(side='left')
        tk.Spinbox(page_controls, from_=1, to=999, textvariable=self.start_page, 
                  width=5, font=("Arial", 10)).pack(side='left', padx=5)

        tk.Label(page_controls, text="To:", bg='white').pack(side='left', padx=(10,0))
        tk.Spinbox(page_controls, from_=1, to=999, textvariable=self.end_page, 
                  width=5, font=("Arial", 10)).pack(side='left', padx=5)

        self.total_pages_label = tk.Label(page_controls, text="Total pages: 0", bg='white')
        self.total_pages_label.pack(side='left', padx=(20,0))

        # Speed Control
        speed_frame = tk.Frame(main_frame, bg='white')
        speed_frame.pack(fill='x', padx=20, pady=10)

        tk.Label(speed_frame, text="Speech Speed (50-400 words/min):", 
                font=("Arial", 12, "bold"), bg='white').pack(anchor='w')

        speed_control = tk.Frame(speed_frame, bg='white')
        speed_control.pack(fill='x', pady=5)

        self.speed_scale = tk.Scale(speed_control, from_=50, to=400, orient='horizontal',
                                   variable=self.speed, bg='white', font=("Arial", 10))
        self.speed_scale.pack(fill='x', pady=5)

        self.speed_label = tk.Label(speed_control, text="Current: 200 words/min", bg='white')
        self.speed_label.pack()
        self.speed_scale.bind("<Motion>", self.update_speed_label)

        # Voice Selection
        voice_frame = tk.Frame(main_frame, bg='white')
        voice_frame.pack(fill='x', padx=20, pady=10)

        tk.Label(voice_frame, text="Voice Gender:", font=("Arial", 12, "bold"), bg='white').pack(anchor='w')

        voice_controls = tk.Frame(voice_frame, bg='white')
        voice_controls.pack(fill='x', pady=5)

        tk.Radiobutton(voice_controls, text="Male", variable=self.voice_gender, value="male",
                      bg='white', font=("Arial", 10)).pack(side='left')
        tk.Radiobutton(voice_controls, text="Female", variable=self.voice_gender, value="female",
                      bg='white', font=("Arial", 10)).pack(side='left', padx=(20,0))

        # Output Selection
        output_frame = tk.Frame(main_frame, bg='white')
        output_frame.pack(fill='x', padx=20, pady=10)

        tk.Label(output_frame, text="Output Location:", font=("Arial", 12, "bold"), bg='white').pack(anchor='w')

        output_select_frame = tk.Frame(output_frame, bg='white')
        output_select_frame.pack(fill='x', pady=5)

        tk.Entry(output_select_frame, textvariable=self.output_path, font=("Arial", 10), 
                width=50, state='readonly').pack(side='left', fill='x', expand=True)
        tk.Button(output_select_frame, text="Browse", command=self.select_output_file,
                 bg='#6A5ACD', fg='white', font=("Arial", 10)).pack(side='right', padx=(5,0))

        # Progress Bar
        progress_frame = tk.Frame(main_frame, bg='white')
        progress_frame.pack(fill='x', padx=20, pady=10)

        self.progress = Progressbar(progress_frame, mode='determinate')
        self.progress.pack(fill='x', pady=5)

        self.progress_label = tk.Label(progress_frame, text="Ready to convert", bg='white')
        self.progress_label.pack()

        # Convert Button
        button_frame = tk.Frame(main_frame, bg='white')
        button_frame.pack(pady=20)

        self.convert_btn = tk.Button(button_frame, text="Convert & Download", 
                                    command=self.start_conversion,
                                    bg='#6A5ACD', fg='white', font=("Arial", 14, "bold"),
                                    width=20, height=2)
        self.convert_btn.pack()

    def update_speed_label(self, event):
        """Update speed label when scale moves"""
        self.speed_label.config(text=f"Current: {self.speed.get()} words/min")

    def select_pdf_file(self):
        """Select PDF file"""
        filename = filedialog.askopenfilename(
            title="Select PDF File",
            filetypes=[("PDF files", "*.pdf")]
        )
        if filename:
            self.pdf_path.set(filename)
            try:
                reader = PdfReader(filename)
                total_pages = len(reader.pages)
                self.total_pages.set(total_pages)
                self.total_pages_label.config(text=f"Total pages: {total_pages}")
                self.end_page.set(total_pages)
            except Exception as e:
                messagebox.showerror("Error", f"Could not read PDF: {str(e)}")

    def select_output_file(self):
        """Select output file location"""
        filename = filedialog.asksaveasfilename(
            title="Save Audio As",
            defaultextension=".mp3",
            filetypes=[("MP3 files", "*.mp3"), ("WAV files", "*.wav")]
        )
        if filename:
            self.output_path.set(filename)

    def start_conversion(self):
        """Start the conversion process in a separate thread"""
        if not self.pdf_path.get():
            messagebox.showerror("Error", "Please select a PDF file")
            return
        if not self.output_path.get():
            messagebox.showerror("Error", "Please select output location")
            return

        # Disable convert button
        self.convert_btn.config(state='disabled')
        self.progress_label.config(text="Starting conversion...")

        # Start conversion in separate thread
        thread = threading.Thread(target=self.convert_pdf_to_audio)
        thread.daemon = True
        thread.start()

    def convert_pdf_to_audio(self):
        """Convert PDF to audio"""
        try:
            # Read PDF
            reader = PdfReader(self.pdf_path.get())
            total_pages = len(reader.pages)

            start_page = max(1, self.start_page.get()) - 1  # Convert to 0-based index
            end_page = min(total_pages, self.end_page.get())

            if start_page >= end_page:
                raise ValueError("Invalid page range")

            # Setup TTS engine
            self.engine.setProperty('rate', self.speed.get())

            # Set voice gender
            if self.voice_gender.get() == "female" and self.female_voice:
                self.engine.setProperty('voice', self.female_voice)
            elif self.male_voice:
                self.engine.setProperty('voice', self.male_voice)

            # Extract text from pages
            full_text = ""
            pages_to_process = end_page - start_page

            for i in range(start_page, end_page):
                # Update progress
                progress = ((i - start_page + 1) / pages_to_process) * 50  # First 50% for text extraction
                self.progress['value'] = progress
                self.progress_label.config(text=f"Extracting text from page {i+1}...")
                self.root.update()

                try:
                    page_text = reader.pages[i].extract_text()
                    if page_text.strip():
                        full_text += page_text + "\n\n"
                except Exception as e:
                    print(f"Error extracting text from page {i+1}: {str(e)}")
                    continue

            if not full_text.strip():
                raise ValueError("No text found in the selected pages")

            # Update progress
            self.progress['value'] = 60
            self.progress_label.config(text="Converting text to speech...")
            self.root.update()

            # Save to audio file
            self.engine.save_to_file(full_text, self.output_path.get())
            self.engine.runAndWait()

            # Complete
            self.progress['value'] = 100
            self.progress_label.config(text="Conversion completed successfully!")

            messagebox.showinfo("Success", f"Audio file saved successfully!\n\nLocation: {self.output_path.get()}\n\nPages converted: {start_page+1} to {end_page}\nSpeed: {self.speed.get()} words/min\nVoice: {self.voice_gender.get()}")

        except Exception as e:
            self.progress['value'] = 0
            self.progress_label.config(text="Conversion failed")
            messagebox.showerror("Error", f"Conversion failed: {str(e)}")
        finally:
            # Re-enable convert button
            self.convert_btn.config(state='normal')

    def run(self):
        """Run the application"""
        self.root.mainloop()

if __name__ == "__main__":
    converter = PDFToAudioConverter()
    converter.run()
