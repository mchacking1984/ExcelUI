' =============================================================================
' VBA Module: Generate Interactive Charts
' =============================================================================
' This module provides a button to generate interactive HTML charts from
' your Excel time series data.
'
' INSTALLATION INSTRUCTIONS:
' 1. Open your Excel file
' 2. Press Alt+F11 to open VBA Editor
' 3. Go to Insert > Module
' 4. Copy and paste this entire code
' 5. Close the VBA Editor
' 6. Go to Developer > Insert > Button (Form Control)
' 7. Draw the button on your sheet
' 8. When prompted, select "GenerateInteractiveCharts" macro
' 9. Right-click the button and rename it to "Generate Charts"
'
' PREREQUISITES:
' - Python 3.8+ installed and in PATH
' - Required packages: pip install pandas plotly openpyxl
' - generate_charts.py in the same folder as your Excel file
' =============================================================================

Option Explicit

' Configuration - Modify these as needed
Private Const PYTHON_PATH As String = "python"  ' Or full path like "C:\Python311\python.exe"
Private Const CHART_SCRIPT As String = "generate_charts.py"
Private Const OUTPUT_FILE As String = "sp500_dashboard.html"

Sub GenerateInteractiveCharts()
    ' Main subroutine to generate interactive HTML charts

    Dim workbookPath As String
    Dim workbookName As String
    Dim scriptPath As String
    Dim outputPath As String
    Dim cmdLine As String
    Dim result As Long
    Dim wsh As Object
    Dim waitOnReturn As Boolean
    Dim windowStyle As Integer

    On Error GoTo ErrorHandler

    ' Get paths
    workbookPath = ThisWorkbook.Path
    workbookName = ThisWorkbook.FullName
    scriptPath = workbookPath & "\" & CHART_SCRIPT
    outputPath = workbookPath & "\" & OUTPUT_FILE

    ' Verify script exists
    If Dir(scriptPath) = "" Then
        MsgBox "Error: Cannot find '" & CHART_SCRIPT & "' in the workbook folder." & vbCrLf & vbCrLf & _
               "Please ensure the Python script is in: " & vbCrLf & workbookPath, _
               vbCritical, "Script Not Found"
        Exit Sub
    End If

    ' Save workbook to ensure latest data is used
    If Not ThisWorkbook.Saved Then
        Dim saveResult As VbMsgBoxResult
        saveResult = MsgBox("The workbook has unsaved changes. Save before generating charts?", _
                           vbYesNoCancel + vbQuestion, "Save Workbook?")
        If saveResult = vbYes Then
            ThisWorkbook.Save
        ElseIf saveResult = vbCancel Then
            Exit Sub
        End If
    End If

    ' Show progress
    Application.StatusBar = "Generating interactive charts..."
    Application.Cursor = xlWait

    ' Build command line
    cmdLine = PYTHON_PATH & " """ & scriptPath & """ """ & workbookName & """ --output """ & outputPath & """"

    ' Execute Python script
    Set wsh = CreateObject("WScript.Shell")
    waitOnReturn = True
    windowStyle = 0  ' Hidden window

    result = wsh.Run("cmd /c " & cmdLine, windowStyle, waitOnReturn)

    ' Reset UI
    Application.StatusBar = False
    Application.Cursor = xlDefault

    ' Check result
    If result = 0 Then
        ' Success - open the HTML file
        MsgBox "Charts generated successfully!" & vbCrLf & vbCrLf & _
               "Opening: " & outputPath, vbInformation, "Success"
        wsh.Run """" & outputPath & """", 1, False
    Else
        MsgBox "Error generating charts. Exit code: " & result & vbCrLf & vbCrLf & _
               "Please check:" & vbCrLf & _
               "1. Python is installed and in PATH" & vbCrLf & _
               "2. Required packages are installed (pandas, plotly, openpyxl)" & vbCrLf & _
               "3. The script file exists", vbCritical, "Generation Failed"
    End If

    Set wsh = Nothing
    Exit Sub

ErrorHandler:
    Application.StatusBar = False
    Application.Cursor = xlDefault
    MsgBox "Error: " & Err.Description, vbCritical, "Error"
End Sub

Sub GenerateChartsWithOptions()
    ' Alternative subroutine with user options

    Dim chartTitle As String
    Dim openInBrowser As VbMsgBoxResult

    ' Get chart title from user
    chartTitle = InputBox("Enter a title for your charts:", "Chart Title", "S&P 500 Analysis")
    If chartTitle = "" Then Exit Sub

    ' Ask about opening in browser
    openInBrowser = MsgBox("Open the chart in your browser when complete?", vbYesNo + vbQuestion, "Open Browser?")

    ' Call main generation with options
    GenerateChartsAdvanced chartTitle, (openInBrowser = vbYes)
End Sub

Private Sub GenerateChartsAdvanced(ByVal title As String, ByVal openBrowser As Boolean)
    ' Advanced chart generation with options

    Dim workbookPath As String
    Dim workbookName As String
    Dim scriptPath As String
    Dim outputPath As String
    Dim cmdLine As String
    Dim result As Long
    Dim wsh As Object

    On Error GoTo ErrorHandler

    workbookPath = ThisWorkbook.Path
    workbookName = ThisWorkbook.FullName
    scriptPath = workbookPath & "\" & CHART_SCRIPT
    outputPath = workbookPath & "\" & OUTPUT_FILE

    Application.StatusBar = "Generating interactive charts..."
    Application.Cursor = xlWait

    ' Build command with options
    cmdLine = PYTHON_PATH & " """ & scriptPath & """ """ & workbookName & """ " & _
              "--output """ & outputPath & """ --title """ & title & """"

    If Not openBrowser Then
        cmdLine = cmdLine & " --no-open"
    End If

    Set wsh = CreateObject("WScript.Shell")
    result = wsh.Run("cmd /c " & cmdLine, 0, True)

    Application.StatusBar = False
    Application.Cursor = xlDefault

    If result = 0 Then
        If openBrowser Then
            wsh.Run """" & outputPath & """", 1, False
        End If
        MsgBox "Charts generated successfully!" & vbCrLf & "File: " & outputPath, vbInformation, "Success"
    Else
        MsgBox "Error generating charts. Exit code: " & result, vbCritical, "Error"
    End If

    Set wsh = Nothing
    Exit Sub

ErrorHandler:
    Application.StatusBar = False
    Application.Cursor = xlDefault
    MsgBox "Error: " & Err.Description, vbCritical, "Error"
End Sub

Sub AddChartButton()
    ' Utility to add a chart generation button to the active sheet

    Dim btn As Button
    Dim ws As Worksheet

    Set ws = ActiveSheet

    ' Create button
    Set btn = ws.Buttons.Add(10, 10, 150, 30)

    With btn
        .OnAction = "GenerateInteractiveCharts"
        .Caption = "Generate Interactive Charts"
        .Name = "btnGenerateCharts"
    End With

    MsgBox "Button added! Click it to generate your interactive charts.", vbInformation, "Button Added"
End Sub

Sub TestPythonInstallation()
    ' Test if Python is properly installed and accessible

    Dim wsh As Object
    Dim result As Long
    Dim tempFile As String
    Dim fso As Object
    Dim ts As Object
    Dim output As String

    On Error GoTo ErrorHandler

    tempFile = Environ("TEMP") & "\python_test.txt"

    Set wsh = CreateObject("WScript.Shell")
    result = wsh.Run("cmd /c " & PYTHON_PATH & " --version > """ & tempFile & """ 2>&1", 0, True)

    If result = 0 Then
        ' Read output
        Set fso = CreateObject("Scripting.FileSystemObject")
        Set ts = fso.OpenTextFile(tempFile, 1)
        output = ts.ReadAll
        ts.Close
        fso.DeleteFile tempFile

        MsgBox "Python is installed!" & vbCrLf & vbCrLf & Trim(output), vbInformation, "Python Found"
    Else
        MsgBox "Python was not found in PATH." & vbCrLf & vbCrLf & _
               "Please install Python and ensure it's added to your system PATH.", _
               vbCritical, "Python Not Found"
    End If

    Set wsh = Nothing
    Exit Sub

ErrorHandler:
    MsgBox "Error testing Python: " & Err.Description, vbCritical, "Error"
End Sub
